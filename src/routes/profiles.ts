import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { userRepository } from '../db/repositories/user.repository.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';
import { followRepository } from '../db/repositories/follow.repository.js';
import { query } from '../db/unified-client.js';

export const profileRouter = Router();

// GET /users/by-trpgo/:trpgoId — Resolve OIDC sub to internal user page
// TRPGOファミリーフィードからのリンク用: trpgo_user_id → internal user ID にリダイレクト
const SAFE_TRPGO_ID_RE = /^[A-Za-z0-9_-]+$/;
profileRouter.get('/users/by-trpgo/:trpgoId', async (req, res) => {
  try {
    const { trpgoId } = req.params;
    if (!SAFE_TRPGO_ID_RE.test(trpgoId)) {
      sendError(res, 400, 'validation_error', 'Invalid TRPGO user ID');
      return;
    }
    const user = await userRepository.findByTrpgoUserId(trpgoId);
    if (!user) {
      // ユーザーが見つからない場合はトップページにリダイレクト
      res.redirect('/');
      return;
    }
    res.redirect(`/users/${user.id}`);
  } catch (err) {
    console.error('[Profile] TRPGO lookup error:', err);
    sendError(res, 500, 'internal_error', 'Failed to look up user');
  }
});

// GET /users/:id — Public profile
profileRouter.get('/users/:id', async (req, res) => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (!user) {
      sendError(res, 404, 'not_found', 'User not found');
      return;
    }

    const profileResult = await query<any>(
      `SELECT bio, website_url, twitter_handle, follower_count, scenario_count, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    const profile = profileResult.rows[0] ?? {};
    const scenarios = await scenarioRepository.search({
      sort: 'newest',
      limit: 20,
    });
    // Filter to this author's published scenarios
    const authorScenarios = scenarios.items.filter(s => s.authorId === req.params.id);

    let isFollowing = false;
    if (req.user) {
      isFollowing = await followRepository.isFollowing(req.user.id, req.params.id);
    }

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: profile.bio ?? '',
        websiteUrl: profile.website_url,
        twitterHandle: profile.twitter_handle,
        followerCount: profile.follower_count ?? 0,
        scenarioCount: profile.scenario_count ?? 0,
        createdAt: profile.created_at,
      },
      scenarios: authorScenarios,
      isFollowing,
    });
  } catch (err) {
    console.error('[Profile] Error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch profile');
  }
});

// PUT /users/me/profile — Update own profile
profileRouter.put('/users/me/profile', requireAuth, async (req, res) => {
  try {
    const { bio, websiteUrl, twitterHandle } = req.body;
    const userId = req.user!.id;

    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let i = 1;

    if (bio !== undefined) { sets.push(`bio = $${i++}`); values.push(bio.slice(0, 500)); }
    if (websiteUrl !== undefined) { sets.push(`website_url = $${i++}`); values.push(websiteUrl || null); }
    if (twitterHandle !== undefined) { sets.push(`twitter_handle = $${i++}`); values.push(twitterHandle || null); }

    values.push(userId);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, values);

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Profile] Update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update profile');
  }
});

// PUT /users/me/preferences — Update reading preferences (theme, font size)
profileRouter.put('/users/me/preferences', requireAuth, async (req, res) => {
  try {
    const { theme, fontSize } = req.body;
    const userId = req.user!.id;

    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let i = 1;

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      sets.push(`theme = $${i++}`); values.push(theme);
    }
    if (fontSize && ['small', 'medium', 'large'].includes(fontSize)) {
      sets.push(`font_size = $${i++}`); values.push(fontSize);
    }

    values.push(userId);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, values);

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Preferences] Update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update preferences');
  }
});
