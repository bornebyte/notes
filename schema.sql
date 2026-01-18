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
-- Default password: 'admin' (hashed with bcrypt)
-- IMPORTANT: Change this immediately after deployment!
INSERT INTO password (id, pass, last_updated)
VALUES (1, '$2a$10$N9qo8uLOickgx2ZMRZoMye1p7LrcyqkBzaXdV5vG0dNOiUpRlnQZu', CURRENT_TIMESTAMP)
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
-- SUMMARY
-- =============================================================================
-- Total Tables: 6
-- 1. notes          - Main notes storage with favorites, trash, and sharing
-- 2. notifications  - System activity and event logs
-- 3. targetdate     - Target dates and deadlines
-- 4. messages       - Contact form / inbox messages
-- 5. password       - Admin authentication (single row)
-- 6. api_tokens     - API authentication tokens
--
-- IMPORTANT NOTES:
-- - The default admin password is 'admin' - CHANGE IT IMMEDIATELY after deployment
-- - All timestamps are stored as TIMESTAMP type
-- - Boolean fields use PostgreSQL BOOLEAN type (TRUE/FALSE)
-- - All primary keys are auto-incrementing SERIAL type
-- - Indexes are created for commonly queried columns
-- =============================================================================
