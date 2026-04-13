import { query } from './unified-client.js';

export async function seedDevelopmentData(): Promise<void> {
  console.log('[Seed] Seeding development data...');

  // Users
  const users = [
    { id: 'user_1', name: 'テストユーザー', provider: 'discord' },
    { id: 'user_2', name: 'GM太郎', provider: 'discord' },
    { id: 'user_3', name: 'シナリオ職人', provider: 'discord' },
    { id: 'user_google', name: 'Googleユーザー', provider: 'google' },
    { id: 'user_line', name: 'LINEユーザー', provider: 'line' },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (id, name, provider, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [u.id, u.name, u.provider]
    );
  }

  // Facts
  for (const u of users) {
    const isL2 = ['google', 'line'].includes(u.provider);
    const facts = {
      user_id: u.id,
      auth: { social_linked: true, l2_verified: isL2, l2_method: isL2 ? 'oauth_provider' : null },
      verification: { identity: null, rights: null },
      status: { account: 'active', featured: false },
    };
    await query(
      `INSERT INTO facts_snapshot (user_id, auth_social_linked, auth_l2_verified, auth_l2_method,
       status_account, status_featured, tier, facts_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [u.id, true, isL2, isL2 ? 'oauth_provider' : null, 'active', false, isL2 ? 'participant' : 'observer', JSON.stringify(facts)]
    );
  }

  // Default tags
  const tags = [
    { id: 'tag_coc', name: 'クトゥルフ神話TRPG', category: 'system' },
    { id: 'tag_sw', name: 'ソード・ワールド2.5', category: 'system' },
    { id: 'tag_dx3', name: 'ダブルクロス The 3rd Edition', category: 'system' },
    { id: 'tag_insane', name: 'インセイン', category: 'system' },
    { id: 'tag_shinobigami', name: 'シノビガミ', category: 'system' },
    { id: 'tag_horror', name: 'ホラー', category: 'genre' },
    { id: 'tag_fantasy', name: 'ファンタジー', category: 'genre' },
    { id: 'tag_modern', name: '現代', category: 'genre' },
    { id: 'tag_mystery', name: 'ミステリー', category: 'genre' },
    { id: 'tag_comedy', name: 'コメディ', category: 'genre' },
    { id: 'tag_beginner', name: '初心者向け', category: 'theme' },
    { id: 'tag_short', name: '短時間', category: 'duration' },
  ];

  for (const t of tags) {
    await query(
      `INSERT INTO tags (id, name, category, created_at) VALUES ($1, $2, $3, NOW())`,
      [t.id, t.name, t.category]
    );
  }

  // Sample scenario
  const chapters = JSON.stringify([
    { id: 'ch1', title: '導入', order: 1, content: '探索者たちは古い洋館への招待状を受け取る...', gm_only: false },
    { id: 'ch2', title: '探索パート', order: 2, content: '洋館の各部屋を探索し、手がかりを集める...', gm_only: false },
    { id: 'ch3', title: 'GM情報: 真相', order: 3, content: '洋館の主人は実は...（ネタバレ注意）', gm_only: true },
  ]);

  await query(
    `INSERT INTO scenarios (id, author_id, title, description, system_tag, genre,
     player_count_min, player_count_max, estimated_time, chapters, status, visibility, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())`,
    ['scenario_1', 'user_2', '忘却の洋館', '古い洋館を舞台にしたクトゥルフ神話TRPGシナリオ。初心者にもおすすめの短時間シナリオです。',
     'クトゥルフ神話TRPG', 'ホラー', 2, 4, '3-4時間', chapters, 'published', 'public']
  );

  await query(
    `INSERT INTO scenario_tags (scenario_id, tag_id) VALUES ($1, $2)`,
    ['scenario_1', 'tag_coc']
  );
  await query(
    `INSERT INTO scenario_tags (scenario_id, tag_id) VALUES ($1, $2)`,
    ['scenario_1', 'tag_horror']
  );
  await query(
    `INSERT INTO scenario_tags (scenario_id, tag_id) VALUES ($1, $2)`,
    ['scenario_1', 'tag_beginner']
  );

  await query(
    `INSERT INTO scenario_stats (scenario_id, avg_rating, review_count, view_count, bookmark_count, weekly_views, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    ['scenario_1', 4.5, 2, 120, 15, 30]
  );

  console.log('[Seed] Development data seeded.');
}
