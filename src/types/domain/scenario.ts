export interface ScenarioChapter {
  id: string;
  title: string;
  order: number;
  content: string;
  gm_only: boolean;
}

export type ScenarioStatus = 'draft' | 'published' | 'archived' | 'deleted';
export type ScenarioVisibility = 'public' | 'private' | 'unlisted';
export type SpoilerLevel = 'none' | 'mild' | 'heavy';

export interface Scenario {
  id: string;
  authorId: string;
  title: string;
  description: string;
  systemTag: string;
  genre: string;
  playerCountMin: number;
  playerCountMax: number;
  estimatedTime: string | null;
  chapters: ScenarioChapter[];
  coverImageUrl: string | null;
  status: ScenarioStatus;
  visibility: ScenarioVisibility;
  spoilerLevel: SpoilerLevel;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioSummary {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  title: string;
  description: string;
  systemTag: string;
  genre: string;
  playerCountMin: number;
  playerCountMax: number;
  estimatedTime: string | null;
  coverImageUrl: string | null;
  status: ScenarioStatus;
  spoilerLevel: SpoilerLevel;
  avgRating: number;
  reviewCount: number;
  viewCount: number;
  bookmarkCount: number;
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
}

export interface ScenarioStats {
  scenarioId: string;
  avgRating: number;
  reviewCount: number;
  viewCount: number;
  bookmarkCount: number;
  weeklyViews: number;
}
