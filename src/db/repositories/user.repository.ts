import { query } from '../unified-client.js';
import type { User } from '../../types/index.js';
import type { UserFacts } from '../../types/domain/facts.js';
import { ANONYMOUS_FACTS, computeTier } from '../../types/domain/facts.js';

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<{
    id: string;
    name: string;
    provider: string;
    avatar_url: string | null;
  }>('SELECT id, name, provider, avatar_url FROM users WHERE id = $1', [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export async function createUser(user: {
  id: string;
  name: string;
  provider: string;
  providerId?: string;
  avatarUrl?: string;
}): Promise<User> {
  await query(
    `INSERT INTO users (id, name, provider, provider_id, avatar_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [user.id, user.name, user.provider, user.providerId ?? null, user.avatarUrl ?? null]
  );

  return {
    id: user.id,
    name: user.name,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
  };
}

export async function updateUser(
  id: string,
  updates: Partial<{ name: string; avatarUrl: string }>
): Promise<void> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatarUrl);
  }

  values.push(id);

  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function findByProvider(provider: string, providerId: string): Promise<User | null> {
  const result = await query<{
    id: string;
    name: string;
    provider: string;
    avatar_url: string | null;
  }>(
    'SELECT id, name, provider, avatar_url FROM users WHERE provider = $1 AND provider_id = $2',
    [provider, providerId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export async function getUserFacts(userId: string): Promise<UserFacts> {
  const result = await query<{ facts_json: UserFacts }>(
    'SELECT facts_json FROM facts_snapshot WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return { ...ANONYMOUS_FACTS, user_id: userId };
  }

  return result.rows[0].facts_json;
}

export async function upsertUserFacts(facts: UserFacts): Promise<void> {
  const tier = computeTier(facts);

  await query(
    `INSERT INTO facts_snapshot (
      user_id, auth_social_linked, auth_l2_verified, auth_l2_method,
      verification_identity_state, verification_identity_expires,
      verification_rights_state, verification_rights_scope, verification_rights_expires,
      status_account, status_featured, tier, facts_json, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      auth_social_linked = EXCLUDED.auth_social_linked,
      auth_l2_verified = EXCLUDED.auth_l2_verified,
      auth_l2_method = EXCLUDED.auth_l2_method,
      verification_identity_state = EXCLUDED.verification_identity_state,
      verification_identity_expires = EXCLUDED.verification_identity_expires,
      verification_rights_state = EXCLUDED.verification_rights_state,
      verification_rights_scope = EXCLUDED.verification_rights_scope,
      verification_rights_expires = EXCLUDED.verification_rights_expires,
      status_account = EXCLUDED.status_account,
      status_featured = EXCLUDED.status_featured,
      tier = EXCLUDED.tier,
      facts_json = EXCLUDED.facts_json,
      updated_at = NOW()`,
    [
      facts.user_id,
      facts.auth.social_linked,
      facts.auth.l2_verified,
      facts.auth.l2_method,
      facts.verification.identity,
      facts.verification.identity_expires_at ?? null,
      facts.verification.rights?.state ?? null,
      facts.verification.rights?.scope ?? null,
      facts.verification.rights?.expires_at ?? null,
      facts.status.account,
      facts.status.featured,
      tier,
      JSON.stringify(facts),
    ]
  );
}

export const userRepository = {
  findById: findUserById,
  findByProvider,
  create: createUser,
  createUser,
  update: updateUser,
  updateUser,
  getFacts: getUserFacts,
  upsertFacts: upsertUserFacts,
};
