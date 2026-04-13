-- Sprink Initial Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO migrations (name) VALUES ('001_initial_schema') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'trpgo',
    provider_id TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users (provider, provider_id);

CREATE TABLE IF NOT EXISTS facts_snapshot (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    auth_social_linked BOOLEAN NOT NULL DEFAULT FALSE,
    auth_l2_verified BOOLEAN NOT NULL DEFAULT FALSE,
    auth_l2_method TEXT,
    verification_identity_state TEXT,
    verification_identity_expires TIMESTAMPTZ,
    verification_rights_state TEXT,
    verification_rights_scope JSONB,
    verification_rights_expires TIMESTAMPTZ,
    status_account TEXT NOT NULL DEFAULT 'active',
    status_featured BOOLEAN NOT NULL DEFAULT FALSE,
    tier TEXT NOT NULL DEFAULT 'anonymous',
    facts_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

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
    chapters JSONB NOT NULL DEFAULT '[]',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
    spoiler_level TEXT NOT NULL DEFAULT 'none' CHECK (spoiler_level IN ('none', 'mild', 'heavy')),
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scenarios_author ON scenarios (author_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios (status);
CREATE INDEX IF NOT EXISTS idx_scenarios_visibility ON scenarios (visibility);
CREATE INDEX IF NOT EXISTS idx_scenarios_system_tag ON scenarios (system_tag);
CREATE INDEX IF NOT EXISTS idx_scenarios_published_at ON scenarios (published_at);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('system', 'genre', 'theme', 'player_count', 'duration', 'other')),
    display_order INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags (category);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

CREATE TABLE IF NOT EXISTS scenario_tags (
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_scenario_tags_tag ON scenario_tags (tag_id);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (scenario_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_scenario ON reviews (scenario_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

CREATE TABLE IF NOT EXISTS scenario_stats (
    scenario_id TEXT PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
    avg_rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    bookmark_count INTEGER NOT NULL DEFAULT 0,
    weekly_views INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scenario_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id, created_at DESC);
