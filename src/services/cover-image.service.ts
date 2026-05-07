/**
 * Cover Image Service
 * humサービスと連携してシナリオのカバー画像を自動生成
 */

import { config } from '../lib/config.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';

const FETCH_TIMEOUT_MS = 120_000;
const SAFE_PROMPT_MAX = 800;

// ── Genre → Prompt Style mapping ────────────────────────────────────────────

const GENRE_STYLE_MAP: Record<string, string> = {
  horror: 'dark atmospheric horror illustration, eerie lighting, muted colors, unsettling mood',
  fantasy: 'epic fantasy illustration, magical atmosphere, warm dramatic lighting, detailed environment',
  sf: 'sci-fi concept art, futuristic atmosphere, neon accent lighting, cinematic',
  scifi: 'sci-fi concept art, futuristic atmosphere, neon accent lighting, cinematic',
  modern: 'modern urban illustration, realistic lighting, contemporary setting, cinematic composition',
  mystery: 'mystery noir illustration, dramatic shadows, moody atmosphere, suspenseful',
  comedy: 'bright colorful illustration, cheerful atmosphere, warm lighting, inviting',
  action: 'dynamic action illustration, intense lighting, dramatic composition, cinematic',
};

const SYSTEM_STYLE_MAP: Record<string, string> = {
  coc: 'cosmic horror atmosphere, Lovecraftian, dark mysterious setting',
  'call of cthulhu': 'cosmic horror atmosphere, Lovecraftian, dark mysterious setting',
  'クトゥルフ': 'cosmic horror atmosphere, Lovecraftian, dark mysterious setting',
  'クトゥルフ神話trpg': 'cosmic horror atmosphere, Lovecraftian, dark mysterious setting',
  dnd: 'high fantasy medieval world, dungeons and magic, epic adventure',
  'd&d': 'high fantasy medieval world, dungeons and magic, epic adventure',
  'ソード・ワールド': 'Japanese fantasy RPG style, sword and sorcery, detailed anime illustration',
  'insane': 'psychological horror, surreal atmosphere, distorted reality',
  'インセイン': 'psychological horror, surreal atmosphere, distorted reality',
  'シノビガミ': 'Japanese ninja aesthetic, traditional architecture, moonlit stealth',
  'ダブルクロス': 'modern supernatural, urban fantasy, glowing powers, dramatic',
};

const DEFAULT_STYLE = 'atmospheric TRPG scenario illustration, detailed, cinematic lighting';

/**
 * シナリオメタデータからhum用プロンプトを構築
 */
function buildPrompt(scenario: {
  title: string;
  description: string;
  genre: string;
  systemTag: string;
}): string {
  const genreStyle = GENRE_STYLE_MAP[scenario.genre.toLowerCase()] || '';
  const systemKey = Object.keys(SYSTEM_STYLE_MAP).find(
    k => scenario.systemTag.toLowerCase().includes(k),
  );
  const systemStyle = systemKey ? SYSTEM_STYLE_MAP[systemKey] : '';

  const styleHint = [genreStyle, systemStyle].filter(Boolean).join(', ') || DEFAULT_STYLE;

  // 説明文から最初の数文を抽出（プロンプトの補足に使用）
  const descSnippet = scenario.description
    .replace(/\n+/g, ' ')
    .slice(0, 200)
    .trim();

  const parts = [
    `TRPG scenario book cover illustration.`,
    `Theme: ${scenario.title}.`,
    descSnippet ? `Scene: ${descSnippet}.` : '',
    `Style: ${styleHint}.`,
    'No text, no letters, no words, no typography.',
    'High quality, detailed, professional illustration.',
  ];

  return parts.filter(Boolean).join(' ').slice(0, SAFE_PROMPT_MAX);
}

/**
 * humのAPIを呼んでカバー画像を生成し、URLをDBに保存
 * 非同期で実行（呼び出し元をブロックしない）
 */
export async function generateCoverImage(scenarioId: string): Promise<void> {
  if (!config.hum.url) {
    console.warn('[CoverImage] HUM_URL not configured, skipping cover image generation');
    return;
  }

  try {
    const scenario = await scenarioRepository.findById(scenarioId);
    if (!scenario) {
      console.warn(`[CoverImage] Scenario ${scenarioId} not found`);
      return;
    }

    // 既にカバー画像がある場合はスキップ
    if (scenario.coverImageUrl) {
      console.log(`[CoverImage] Scenario ${scenarioId} already has cover image, skipping`);
      return;
    }

    const prompt = buildPrompt(scenario);
    console.log(`[CoverImage] Generating for scenario ${scenarioId}: ${prompt.slice(0, 100)}...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.hum.serviceToken) {
      headers['X-Service-Token'] = config.hum.serviceToken;
    }

    const response = await fetch(`${config.hum.url}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        model: 'fal-ai/flux-2',
        image_size: 'landscape_16_9',
        num_images: 1,
        num_inference_steps: 28,
        tags: ['sprink', 'cover', scenario.systemTag, scenario.genre].filter(Boolean),
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[CoverImage] hum API error ${response.status}: ${errText.slice(0, 200)}`);
      return;
    }

    const data = await response.json() as {
      images?: Array<{ url: string }>;
      persistent_urls?: string[];
    };

    // persistent_urls（R2保存済み）を優先、なければimages[0].urlを使用
    const imageUrl = data.persistent_urls?.[0]
      ? `${config.hum.url}${data.persistent_urls[0]}`
      : data.images?.[0]?.url || null;

    if (!imageUrl) {
      console.warn(`[CoverImage] No image URL returned for scenario ${scenarioId}`);
      return;
    }

    // DBに保存
    await scenarioRepository.update(scenarioId, { coverImageUrl: imageUrl });
    console.log(`[CoverImage] Saved cover image for scenario ${scenarioId}`);
  } catch (err) {
    // 画像生成の失敗はシナリオ公開をブロックしない
    console.error(`[CoverImage] Failed for scenario ${scenarioId}:`, err);
  }
}
