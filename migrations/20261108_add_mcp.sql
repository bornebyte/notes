-- Apply once to an existing Notes database before deploying the MCP server.
CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
    client_id VARCHAR(128) PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    redirect_uris JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
    code_hash VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(128) NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    code_challenge VARCHAR(128) NOT NULL,
    scope TEXT NOT NULL,
    resource TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expiry ON mcp_oauth_codes(expires_at);

CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
    access_token_hash VARCHAR(64) PRIMARY KEY,
    refresh_token_hash VARCHAR(64) UNIQUE,
    client_id VARCHAR(128) NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    resource TEXT NOT NULL,
    access_expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_expiry ON mcp_oauth_tokens(access_expires_at);

CREATE TABLE IF NOT EXISTS mcp_rate_limits (
    key_hash VARCHAR(64) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key_hash, window_start)
);
