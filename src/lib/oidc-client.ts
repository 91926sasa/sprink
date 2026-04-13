/**
 * OIDC Client — TRPGO認証統合
 *
 * PKCE (S256) + state検証付きのOIDCクライアント実装
 */

import { randomBytes, createHash } from 'crypto';
import { config } from './config.js';

// ============================================
// PKCE
// ============================================

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

// ============================================
// State
// ============================================

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}

// ============================================
// Authorization URL
// ============================================

interface AuthorizeUrlParams {
  codeChallenge: string;
  state: string;
  nonce: string;
}

export function buildAuthorizeUrl(params: AuthorizeUrlParams): string {
  const { issuer, clientId, redirectUri, scopes } = config.trpgo;

  if (!issuer || !clientId || !redirectUri) {
    throw new Error('TRPGO OIDC configuration is incomplete');
  }

  const url = new URL(`${issuer}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('nonce', params.nonce);

  return url.toString();
}

// ============================================
// Token Exchange
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  id_token: string;
  expires_in: number;
}

interface TokenExchangeParams {
  code: string;
  codeVerifier: string;
}

export async function exchangeToken(params: TokenExchangeParams): Promise<TokenResponse> {
  const { issuer, clientId, clientSecret, redirectUri } = config.trpgo;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`Token exchange failed: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<TokenResponse>;
}

// ============================================
// ID Token Claims
// ============================================

export interface TrpgoIdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  name: string;
  picture?: string;
  trust_level: number;
  linked_providers: string[];
  role: string;
}

export function decodeIdTokenPayload(idToken: string): TrpgoIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid id_token format');
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  );

  return payload as TrpgoIdTokenClaims;
}

export function validateIdTokenClaims(
  claims: TrpgoIdTokenClaims,
  expectedNonce?: string
): { valid: boolean; error?: string } {
  const { issuer, clientId } = config.trpgo;

  if (claims.iss !== issuer) {
    return { valid: false, error: `Invalid issuer: ${claims.iss}` };
  }

  if (claims.aud !== clientId) {
    return { valid: false, error: `Invalid audience: ${claims.aud}` };
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    return { valid: false, error: 'Token expired' };
  }

  if (expectedNonce && claims.nonce !== expectedNonce) {
    return { valid: false, error: 'Nonce mismatch' };
  }

  return { valid: true };
}

export function isTrpgoEnabled(): boolean {
  const { issuer, clientId, clientSecret, redirectUri } = config.trpgo;
  return !!(issuer && clientId && clientSecret && redirectUri);
}
