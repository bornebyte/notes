-- Apply before deploying grant-duration support.
ALTER TABLE mcp_oauth_clients
    ADD COLUMN IF NOT EXISTS last_authorized_at TIMESTAMPTZ;

UPDATE mcp_oauth_clients c
SET last_authorized_at = token_history.last_authorized_at
FROM (
    SELECT client_id, MAX(created_at) AS last_authorized_at
    FROM mcp_oauth_tokens
    GROUP BY client_id
) token_history
WHERE c.client_id = token_history.client_id
  AND c.last_authorized_at IS NULL;

ALTER TABLE mcp_oauth_codes
    ADD COLUMN IF NOT EXISTS grant_duration VARCHAR(10) NOT NULL DEFAULT '30d';

ALTER TABLE mcp_oauth_codes
    ADD COLUMN IF NOT EXISTS grant_expires_at TIMESTAMPTZ;

-- Existing authorization codes used the prior 30-day refresh lifetime.
UPDATE mcp_oauth_codes
SET grant_expires_at = created_at + INTERVAL '30 days'
WHERE grant_duration = '30d' AND grant_expires_at IS NULL;

ALTER TABLE mcp_oauth_tokens
    ADD COLUMN IF NOT EXISTS grant_duration VARCHAR(10) NOT NULL DEFAULT '30d';

ALTER TABLE mcp_oauth_tokens
    ALTER COLUMN refresh_expires_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh_expiry
    ON mcp_oauth_tokens(refresh_expires_at);
