-- Add trpgo_user_id for cross-service user identification
ALTER TABLE users ADD COLUMN IF NOT EXISTS trpgo_user_id TEXT UNIQUE;

UPDATE users SET trpgo_user_id = provider_id WHERE provider = 'trpgo' AND trpgo_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_trpgo_user_id ON users(trpgo_user_id) WHERE trpgo_user_id IS NOT NULL;
