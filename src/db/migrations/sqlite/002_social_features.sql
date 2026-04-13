-- Social features: follows, likes, comments, reports, series, notifications, play reports, user profiles

INSERT OR IGNORE INTO migrations (name) VALUES ('002_social_features');

-- User profile extensions
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN website_url TEXT;
ALTER TABLE users ADD COLUMN twitter_handle TEXT;
ALTER TABLE users ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN scenario_count INTEGER NOT NULL DEFAULT 0;

-- Follows
CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);

-- Likes (lightweight interaction, separate from reviews)
CREATE TABLE IF NOT EXISTS likes (
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (scenario_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_scenario ON likes (scenario_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes (user_id);

-- Add like_count to scenario_stats
ALTER TABLE scenario_stats ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- Comments (separate from reviews, for discussion)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    spoiler INTEGER NOT NULL DEFAULT 0,
    edited INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_scenario ON comments (scenario_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id);

-- Add comment_count to scenario_stats
ALTER TABLE scenario_stats ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;

-- Content reports (moderation)
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('scenario', 'review', 'comment', 'user')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'copyright', 'inappropriate', 'spoiler', 'other')),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by TEXT REFERENCES users(id),
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);

-- Series/collections
CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_series_author ON series (author_id);

CREATE TABLE IF NOT EXISTS series_scenarios (
    series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (series_id, scenario_id)
);

-- Add series_id to scenarios
ALTER TABLE scenarios ADD COLUMN series_id TEXT REFERENCES series(id) ON DELETE SET NULL;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_follower', 'new_review', 'new_comment', 'comment_reply',
        'new_like', 'new_bookmark', 'scenario_published', 'report_resolved',
        'series_updated'
    )),
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id TEXT,
    message TEXT NOT NULL DEFAULT '',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read, created_at DESC);

-- Play reports (linking actual play experiences to scenarios)
CREATE TABLE IF NOT EXISTS play_reports (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    player_count INTEGER,
    play_date TEXT,
    duration_minutes INTEGER,
    spoiler INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_play_reports_scenario ON play_reports (scenario_id);
CREATE INDEX IF NOT EXISTS idx_play_reports_user ON play_reports (user_id);

-- Copyright/license tracking
ALTER TABLE scenarios ADD COLUMN license_type TEXT NOT NULL DEFAULT 'all_rights' CHECK (
    license_type IN ('all_rights', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'free_use', 'custom')
);
ALTER TABLE scenarios ADD COLUMN license_note TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN system_copyright TEXT NOT NULL DEFAULT '';

-- Reading preferences
ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system'));
ALTER TABLE users ADD COLUMN font_size TEXT NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));
