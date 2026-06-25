-- =============================================================================
-- Nova auth migration — adds login accounts/roles to the agents table.
-- Run in Supabase dashboard → SQL Editor (safe to re-run).
-- Each agent is also a login user; admins manage accounts in the Users tab.
-- =============================================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';            -- 'admin' | 'agent'
ALTER TABLE agents ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agents_username ON agents(username);

-- The first admin is created from the portal's first-run setup screen
-- (POST /api/auth/bootstrap), which only works while no login accounts exist.
