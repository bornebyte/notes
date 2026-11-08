-- Database Schema for Notes Application
-- This file creates all required tables for the application
-- Run this file during first-time deployment to initialize the database

-- =============================================================================
-- TABLE: notes
-- Stores user notes with support for favorites, trash, and sharing
-- =============================================================================
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(255),
    hidden BOOLEAN DEFAULT FALSE,
    created_at VARCHAR(255) NOT NULL,
    fav BOOLEAN DEFAULT FALSE,
    trash BOOLEAN DEFAULT FALSE,
    archive BOOLEAN DEFAULT FALSE,
    lastupdated TIMESTAMP,
    shareid TEXT UNIQUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_trash ON notes(trash);
CREATE INDEX IF NOT EXISTS idx_notes_fav ON notes(fav);
CREATE INDEX IF NOT EXISTS idx_notes_shareid ON notes(shareid);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- =============================================================================
-- TABLE: notifications
-- Stores system activity and event logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL
);

-- Create indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- =============================================================================
-- TABLE: targetdate
-- Stores target dates and deadlines with optional sharing
-- =============================================================================
CREATE TABLE IF NOT EXISTS targetdate (
    id SERIAL PRIMARY KEY,
    date VARCHAR(255) NOT NULL,
    created_at TEXT NOT NULL,
    message TEXT,
    shareid VARCHAR(255) UNIQUE
);

-- Create index for date ordering
CREATE INDEX IF NOT EXISTS idx_targetdate_date ON targetdate(date);
CREATE INDEX IF NOT EXISTS idx_targetdate_shareid ON targetdate(shareid);

-- =============================================================================
-- TABLE: messages
-- Stores contact form / inbox messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(time DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- =============================================================================
-- TABLE: password
-- Stores the admin password (single row table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS password (
    id INTEGER PRIMARY KEY DEFAULT 1,
    pass TEXT NOT NULL,
    last_updated TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default password if not exists (should be changed on first login)
-- Default password: 'admin' (hashed with crypto-js)
-- IMPORTANT: Change this immediately after deployment!
-- Default secret key used for hashing: 'SECRET_123'
INSERT INTO password (id, pass, last_updated)
VALUES (1, 'U2FsdGVkX1+k/Vgs8Np7OPut/tWAZn+gSOIofhUutqY=', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TABLE: api_tokens
-- Stores API authentication tokens for programmatic access
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

-- Create indexes for token lookup and management
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_revoked ON api_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_api_tokens_created_at ON api_tokens(created_at DESC);

-- =============================================================================
-- TABLES: MCP OAuth clients, one-time authorization codes, and short-lived tokens
-- =============================================================================
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

-- =============================================================================
-- TABLE: push_subscriptions
-- Stores Web Push subscription endpoints for admin devices
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    device_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at DESC);

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Total Tables: 11
-- 1. notes          - Main notes storage with favorites, trash, and sharing
-- 2. notifications  - System activity and event logs
-- 3. targetdate     - Target dates and deadlines
-- 4. messages       - Contact form / inbox messages
-- 5. password       - Admin authentication (single row)
-- 6. api_tokens     - API authentication tokens
-- 7. push_subscriptions - Web Push subscriptions
-- 8. mcp_oauth_clients  - Registered public MCP clients
-- 9. mcp_oauth_codes    - Single-use, PKCE-bound OAuth authorization codes
-- 10. mcp_oauth_tokens   - Hashed OAuth access/refresh tokens
-- 11. mcp_rate_limits    - Shared request limits for protected endpoints
--
-- IMPORTANT NOTES:
-- - The default admin password is 'admin' - CHANGE IT IMMEDIATELY after deployment
-- - All timestamps are stored as TIMESTAMP type
-- - Boolean fields use PostgreSQL BOOLEAN type (TRUE/FALSE)
-- - All primary keys are auto-incrementing SERIAL type
-- - Indexes are created for commonly queried columns
-- - Feedback system fetches data from external API (NEXT_PUBLIC_DOMAIN)
-- =============================================================================
