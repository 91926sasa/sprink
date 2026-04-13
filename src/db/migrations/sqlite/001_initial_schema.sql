-- Sprink Initial Schema (SQLite)

CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO migrations (name) VALUES ('001_initial_schema');

-- Users (synced from TRPGO OIDC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'trpgo',
    provider_id TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users (provider, provider_id);

-- Facts snapshot (trust level)
CREATE TABLE IF NOT EXISTS facts_snapshot (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    auth_social_linked INTEGER NOT NULL DEFAULT 0,
    auth_l2_verified INTEGER NOT NULL DEFAULT 0,
    auth_l2_method TEXT,
    verification_identity_state TEXT,
    verification_identity_expires TEXT,
    verification_rights_state TEXT,
    verification_rights_scope TEXT,
    verification_rights_expires TEXT,
    status_account TEXT NOT NULL DEFAULT 'active',
    status_featured INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'anonymous',
    facts_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- Scenarios
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    system_tag TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    player_count_min INTEGER NOT NULL DEFAULT 1,
    player_count_max INTEGER NOT NULL DEFAULT 4,
    estimated_time TEXT,
    chapters TEXT NOT NULL DEFAULT '[]',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
    spoiler_level TEXT NOT NULL DEFAULT 'none' CHECK (spoiler_level IN ('none', 'mild', 'heavy')),
    version INTEGER NOT NULL DEFAULT 1,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scenarios_author ON scenarios (author_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios (status);
CREATE INDEX IF NOT EXISTS idx_scenarios_visibility ON scenarios (visibility);
CREATE INDEX IF NOT EXISTS idx_scenarios_system_tag ON scenarios (system_tag);
CREATE INDEX IF NOT EXISTS idx_scenarios_published_at ON scenarios (published_at);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('system', 'genre', 'theme', 'player_count', 'duration', 'other')),
    display_order INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags (category);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

-- Scenario-Tag associations
CREATE TABLE IF NOT EXISTS scenario_tags (
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_scenario_tags_tag ON scenario_tags (tag_id);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    spoiler INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (scenario_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_scenario ON reviews (scenario_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

-- Scenario stats (aggregated)
CREATE TABLE IF NOT EXISTS scenario_stats (
    scenario_id TEXT PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
    avg_rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    bookmark_count INTEGER NOT NULL DEFAULT 0,
    weekly_views INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (scenario_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id, created_at DESC);
