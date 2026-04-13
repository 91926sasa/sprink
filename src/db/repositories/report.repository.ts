import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'scenario' | 'review' | 'comment' | 'user';
  targetId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
}

export async function create(params: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string;
}): Promise<string> {
  const id = snowflakeId();
  await query(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [id, params.reporterId, params.targetType, params.targetId, params.reason, params.description]
  );
  return id;
}

export async function findPending(offset = 0, limit = 20): Promise<{ items: Report[]; total: number }> {
  const countResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM reports WHERE status IN ('pending', 'reviewing')"
  );
  const result = await query<any>(
    `SELECT * FROM reports WHERE status IN ('pending', 'reviewing')
     ORDER BY created_at ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return {
    items: result.rows.map(rowToReport),
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function resolve(id: string, resolvedBy: string, status: 'resolved' | 'dismissed'): Promise<void> {
  await query(
    'UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3',
    [status, resolvedBy, id]
  );
}

function rowToReport(row: any): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export const reportRepository = { create, findPending, resolve };
