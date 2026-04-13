import { Router } from 'express';
import { config } from '../lib/config.js';
import { sendSuccess, sendError } from '../lib/response.js';
import { createSession, deleteSession } from '../services/session.service.js';
import { userRepository } from '../db/repositories/user.repository.js';
import {
  isTrpgoEnabled,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeUrl,
  exchangeToken,
  decodeIdTokenPayload,
  validateIdTokenClaims,
} from '../lib/oidc-client.js';
import { snowflakeId } from '../lib/snowflake.js';
import { redis } from '../cache/client.js';

export const authRouter = Router();

const OIDC_FLOW_PREFIX = 'oidc:flow:';
const OIDC_FLOW_TTL = 600;

interface OidcFlow {
  codeVerifier: string;
  nonce: string;
}

async function saveAuthFlow(state: string, flow: OidcFlow): Promise<void> {
  await redis.setex(`${OIDC_FLOW_PREFIX}${state}`, OIDC_FLOW_TTL, JSON.stringify(flow));
}

async function consumeAuthFlow(state: string): Promise<OidcFlow | null> {
  const key = `${OIDC_FLOW_PREFIX}${state}`;
  const data = await redis.get(key);
  if (!data) return null;
  await redis.del(key);
  return JSON.parse(data) as OidcFlow;
}

const PROVIDER_USER_MAP: Record<string, string> = {
  discord: 'user_1',
  google: 'user_google',
  line: 'user_line',
};

authRouter.post('/login', async (req, res) => {
  try {
    if (!config.isDev) {
      sendError(res, 403, 'forbidden', 'Mock login is disabled in production. Use TRPGO login.');
      return;
    }

    const { provider = 'discord' } = req.body;
    const userId = PROVIDER_USER_MAP[provider] || 'user_1';
    const user = await userRepository.findById(userId);
    if (!user) {
      sendError(res, 500, 'internal_error', 'User not found');
      return;
    }

    const sessionId = await createSession(userId);

    res.cookie(config.cookie.name, sessionId, {
      httpOnly: config.cookie.httpOnly,
      sameSite: config.cookie.sameSite,
      secure: config.cookie.secure,
      path: config.cookie.path,
      maxAge: config.cookie.maxAge,
    });

    console.log(`[Auth] Login: uid=${user.id} (${provider})`);
    sendSuccess(res, { success: true, user });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    sendError(res, 500, 'internal_error', 'Login failed');
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies?.[config.cookie.name];
    if (sessionId) {
      await deleteSession(sessionId);
    }
    res.clearCookie(config.cookie.name);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.clearCookie(config.cookie.name);
    sendSuccess(res, { success: true });
  }
});

authRouter.get('/login/trpgo', async (req, res) => {
  if (!isTrpgoEnabled()) {
    sendError(res, 503, 'service_unavailable', 'TRPGO authentication is not configured');
    return;
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateState();

  await saveAuthFlow(state, { codeVerifier, nonce });

  const authorizeUrl = buildAuthorizeUrl({ codeChallenge, state, nonce });
  res.redirect(authorizeUrl);
});

authRouter.get('/callback/trpgo', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('[Auth/TRPGO] OAuth error:', oauthError);
      res.redirect('/?auth_error=denied');
      return;
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      res.redirect('/?auth_error=invalid_callback');
      return;
    }

    const flow = await consumeAuthFlow(state);
    if (!flow) {
      res.redirect('/?auth_error=expired');
      return;
    }

    const tokenResponse = await exchangeToken({
      code,
      codeVerifier: flow.codeVerifier,
    });

    const claims = decodeIdTokenPayload(tokenResponse.id_token);
    const validation = validateIdTokenClaims(claims, flow.nonce);
    if (!validation.valid) {
      console.error('[Auth/TRPGO] id_token validation failed:', validation.error);
      res.redirect('/?auth_error=invalid_token');
      return;
    }

    const existingUser = await userRepository.findByProvider('trpgo', claims.sub);
    let userId: string;

    if (existingUser) {
      await userRepository.updateUser(existingUser.id, {
        name: claims.name,
        avatarUrl: claims.picture,
      });
      userId = existingUser.id;
    } else {
      userId = snowflakeId();
      await userRepository.createUser({
        id: userId,
        provider: 'trpgo',
        providerId: claims.sub,
        name: claims.name,
        avatarUrl: claims.picture,
      });
    }

    await userRepository.upsertFacts({
      user_id: userId,
      auth: {
        social_linked: true,
        l2_verified: claims.trust_level >= 2,
        l2_method: claims.trust_level >= 2 ? 'oauth_provider' as const : null,
      },
      verification: {
        identity: claims.role === 'admin' ? 'active' as const : null,
        rights: null,
      },
      status: {
        account: 'active' as const,
        featured: false,
      },
    });

    const sessionId = await createSession(userId);
    res.cookie(config.cookie.name, sessionId, {
      httpOnly: config.cookie.httpOnly,
      sameSite: config.cookie.sameSite,
      secure: config.cookie.secure,
      path: config.cookie.path,
      maxAge: config.cookie.maxAge,
    });

    console.log(`[Auth/TRPGO] Login: uid=${userId} (trust_level=${claims.trust_level}, role=${claims.role})`);
    res.redirect('/my/scenarios');
  } catch (err) {
    console.error('[Auth/TRPGO] Callback error:', err);
    res.redirect('/?auth_error=server_error');
  }
});

authRouter.get('/trpgo/status', (_req, res) => {
  sendSuccess(res, { enabled: isTrpgoEnabled(), mockEnabled: config.isDev });
});

authRouter.get('/me', (req, res) => {
  if (!req.user) {
    sendSuccess(res, { user: null, authenticated: false });
    return;
  }

  sendSuccess(res, {
    user: req.user,
    authenticated: true,
    facts: {
      tier: req.userFacts.auth.l2_verified ? 'participant' : 'observer',
      l2Verified: req.userFacts.auth.l2_verified,
    },
  });
});
