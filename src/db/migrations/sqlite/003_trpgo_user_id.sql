-- Add trpgo_user_id for cross-service user identification
ALTER TABLE users ADD COLUMN trpgo_user_id TEXT;

UPDATE users SET trpgo_user_id = provider_id WHERE provider = 'trpgo' AND trpgo_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_trpgo_user_id ON users(trpgo_user_id);
