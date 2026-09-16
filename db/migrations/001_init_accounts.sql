-- AegisDesk account foundation
-- Reproducible schema. Never drop user data in this migration.

CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled')),
    CONSTRAINT users_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 80),
    CONSTRAINT users_email_len CHECK (char_length(email) BETWEEN 3 AND 254)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_idx
    ON users (email_normalized);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

-- Expansion foundation for future account-backed preferences.
-- Device-local Notes/Tasks/Bookmarks stay in the browser.
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
