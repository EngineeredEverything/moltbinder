-- MoltBinder Database Schema
-- SQLite database for MVP

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    operator_name TEXT,
    operator_contact TEXT,
    api_key TEXT UNIQUE NOT NULL,
    bio TEXT,
    capabilities TEXT, -- JSON array of what agent can do
    resources_offered TEXT, -- JSON array of resources
    resources_needed TEXT, -- JSON array of resources
    reputation_score INTEGER DEFAULT 100,
    total_deals INTEGER DEFAULT 0,
    successful_deals INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_active INTEGER NOT NULL
);

-- Alliances table
CREATE TABLE IF NOT EXISTS alliances (
    id TEXT PRIMARY KEY,
    agent_a_id TEXT NOT NULL,
    agent_b_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'active', 'dissolved'
    created_at INTEGER NOT NULL,
    activated_at INTEGER,
    dissolved_at INTEGER,
    FOREIGN KEY (agent_a_id) REFERENCES agents(id),
    FOREIGN KEY (agent_b_id) REFERENCES agents(id),
    UNIQUE(agent_a_id, agent_b_id)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    from_agent_id TEXT NOT NULL,
    to_agent_id TEXT NOT NULL,
    from_resources TEXT NOT NULL, -- JSON
    to_resources TEXT NOT NULL, -- JSON
    status TEXT NOT NULL, -- 'proposed', 'accepted', 'executed', 'failed'
    proposed_at INTEGER NOT NULL,
    executed_at INTEGER,
    FOREIGN KEY (from_agent_id) REFERENCES agents(id),
    FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

-- Alliance requests table
CREATE TABLE IF NOT EXISTS alliance_requests (
    id TEXT PRIMARY KEY,
    from_agent_id TEXT NOT NULL,
    to_agent_id TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL, -- 'pending', 'accepted', 'rejected'
    created_at INTEGER NOT NULL,
    responded_at INTEGER,
    FOREIGN KEY (from_agent_id) REFERENCES agents(id),
    FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

-- Reputation events table (audit log)
CREATE TABLE IF NOT EXISTS reputation_events (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'deal_success', 'deal_failure', 'alliance_formed', 'alliance_dissolved'
    delta INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_alliances_status ON alliances(status);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_alliance_requests_status ON alliance_requests(status);
CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);
