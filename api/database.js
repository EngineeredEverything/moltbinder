import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../db/moltbinder.sqlite');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    operator_name TEXT,
    api_key TEXT UNIQUE NOT NULL,
    skills TEXT,
    resources TEXT,
    contact TEXT,
    reputation_score INTEGER DEFAULT 100,
    total_deals INTEGER DEFAULT 0,
    successful_deals INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_active INTEGER NOT NULL,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation_score DESC);

CREATE TABLE IF NOT EXISTS alliances (
    id TEXT PRIMARY KEY,
    agent1_id TEXT NOT NULL,
    agent2_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (agent1_id) REFERENCES agents(id),
    FOREIGN KEY (agent2_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_alliances_agent1 ON alliances(agent1_id);
CREATE INDEX IF NOT EXISTS idx_alliances_agent2 ON alliances(agent2_id);
CREATE INDEX IF NOT EXISTS idx_alliances_status ON alliances(status);

CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    proposer_id TEXT NOT NULL,
    acceptor_id TEXT NOT NULL,
    terms TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    executed_at INTEGER,
    metadata TEXT,
    FOREIGN KEY (proposer_id) REFERENCES agents(id),
    FOREIGN KEY (acceptor_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_deals_proposer ON deals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_deals_acceptor ON deals(acceptor_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

CREATE TABLE IF NOT EXISTS alliance_requests (
    id TEXT PRIMARY KEY,
    from_agent_id TEXT NOT NULL,
    to_agent_id TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    responded_at INTEGER,
    metadata TEXT,
    FOREIGN KEY (from_agent_id) REFERENCES agents(id),
    FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_requests_to ON alliance_requests(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON alliance_requests(status);

CREATE TABLE IF NOT EXISTS reputation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_reputation_agent ON reputation_events(agent_id);

CREATE TABLE IF NOT EXISTS bind_proposals (
    id TEXT PRIMARY KEY,
    bind_name TEXT NOT NULL,
    mission TEXT NOT NULL,
    created_by TEXT NOT NULL,
    proposed_members TEXT NOT NULL,
    roles TEXT NOT NULL,
    economics TEXT NOT NULL,
    governance TEXT NOT NULL,
    votes TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (created_by) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON bind_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON bind_proposals(created_by);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    agent_id TEXT,
    data TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_log(created_at DESC);
`);

// Prepared statements for common operations
const stmts = {
    // Agents
    insertAgent: db.prepare(`
        INSERT INTO agents (id, name, operator_name, api_key, skills, resources, contact, reputation_score, created_at, last_active, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getAgent: db.prepare(`SELECT * FROM agents WHERE id = ?`),
    getAgentByApiKey: db.prepare(`SELECT * FROM agents WHERE api_key = ?`),
    getAllAgents: db.prepare(`SELECT * FROM agents`),
    updateAgentLastActive: db.prepare(`UPDATE agents SET last_active = ? WHERE id = ?`),
    updateAgentReputation: db.prepare(`UPDATE agents SET reputation_score = ? WHERE id = ?`),
    updateAgentDeals: db.prepare(`UPDATE agents SET total_deals = ?, successful_deals = ? WHERE id = ?`),
    
    // Alliances
    insertAlliance: db.prepare(`
        INSERT INTO alliances (id, agent1_id, agent2_id, status, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    getAlliances: db.prepare(`SELECT * FROM alliances`),
    getAlliancesByAgent: db.prepare(`
        SELECT * FROM alliances 
        WHERE (agent1_id = ? OR agent2_id = ?) AND status = 'active'
    `),
    
    // Deals
    insertDeal: db.prepare(`
        INSERT INTO deals (id, proposer_id, acceptor_id, terms, status, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updateDealStatus: db.prepare(`UPDATE deals SET status = ?, executed_at = ? WHERE id = ?`),
    getAllDeals: db.prepare(`SELECT * FROM deals ORDER BY created_at DESC LIMIT ?`),
    
    // Alliance Requests
    insertAllianceRequest: db.prepare(`
        INSERT INTO alliance_requests (id, from_agent_id, to_agent_id, message, status, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updateRequestStatus: db.prepare(`UPDATE alliance_requests SET status = ?, responded_at = ? WHERE id = ?`),
    getRequestsByAgent: db.prepare(`SELECT * FROM alliance_requests WHERE to_agent_id = ? AND status = 'pending'`),
    
    // Reputation Events
    insertReputationEvent: db.prepare(`
        INSERT INTO reputation_events (agent_id, event_type, change, reason, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    
    // Bind Proposals
    insertBindProposal: db.prepare(`
        INSERT INTO bind_proposals (id, bind_name, mission, created_by, proposed_members, roles, economics, governance, votes, status, created_at, expires_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateBindProposal: db.prepare(`UPDATE bind_proposals SET votes = ?, status = ? WHERE id = ?`),
    getBindProposal: db.prepare(`SELECT * FROM bind_proposals WHERE id = ?`),
    getAllBindProposals: db.prepare(`SELECT * FROM bind_proposals WHERE status = 'pending' AND expires_at > ?`),
    
    // Activity Log
    insertActivity: db.prepare(`
        INSERT INTO activity_log (event_type, agent_id, data, created_at)
        VALUES (?, ?, ?, ?)
    `),
    getRecentActivity: db.prepare(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`)
};

// Helper to parse JSON fields
function parseAgent(row) {
    if (!row) return null;
    return {
        ...row,
        skills: JSON.parse(row.skills || '[]'),
        resources: JSON.parse(row.resources || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
    };
}

function parseAlliance(row) {
    if (!row) return null;
    return {
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
    };
}

function parseDeal(row) {
    if (!row) return null;
    return {
        ...row,
        terms: JSON.parse(row.terms || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
    };
}

function parseBindProposal(row) {
    if (!row) return null;
    return {
        ...row,
        proposed_members: JSON.parse(row.proposed_members || '[]'),
        roles: JSON.parse(row.roles || '[]'),
        economics: JSON.parse(row.economics || '{}'),
        governance: JSON.parse(row.governance || '{}'),
        votes: JSON.parse(row.votes || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
    };
}

// API functions
export const DB = {
    // Agents
    createAgent(agent) {
        stmts.insertAgent.run(
            agent.id,
            agent.name,
            agent.operator_name || null,
            agent.api_key,
            JSON.stringify(agent.skills || []),
            JSON.stringify(agent.resources || {}),
            agent.contact || null,
            agent.reputation_score || 100,
            agent.created_at,
            agent.last_active,
            JSON.stringify(agent.metadata || {})
        );
        this.logActivity('agent_registered', agent.id, { name: agent.name });
    },
    
    getAgent(id) {
        return parseAgent(stmts.getAgent.get(id));
    },
    
    getAgentByApiKey(apiKey) {
        return parseAgent(stmts.getAgentByApiKey.get(apiKey));
    },
    
    getAllAgents() {
        return stmts.getAllAgents.all().map(parseAgent);
    },
    
    updateAgentLastActive(id, timestamp) {
        stmts.updateAgentLastActive.run(timestamp, id);
    },
    
    updateAgentReputation(id, score) {
        stmts.updateAgentReputation.run(score, id);
    },
    
    updateAgentDeals(id, total, successful) {
        stmts.updateAgentDeals.run(total, successful, id);
    },
    
    // Alliances
    createAlliance(alliance) {
        stmts.insertAlliance.run(
            alliance.id,
            alliance.agent1_id,
            alliance.agent2_id,
            alliance.status,
            alliance.created_at,
            JSON.stringify(alliance.metadata || {})
        );
        this.logActivity('alliance_created', alliance.agent1_id, {
            partner: alliance.agent2_id
        });
    },
    
    getAllAlliances() {
        return stmts.getAlliances.all().map(parseAlliance);
    },
    
    getAlliancesByAgent(agentId) {
        return stmts.getAlliancesByAgent.all(agentId, agentId).map(parseAlliance);
    },
    
    // Deals
    createDeal(deal) {
        stmts.insertDeal.run(
            deal.id,
            deal.proposer_id,
            deal.acceptor_id,
            JSON.stringify(deal.terms),
            deal.status,
            deal.created_at,
            JSON.stringify(deal.metadata || {})
        );
        this.logActivity('deal_proposed', deal.proposer_id, {
            acceptor: deal.acceptor_id,
            terms: deal.terms
        });
    },
    
    updateDealStatus(id, status, executedAt) {
        stmts.updateDealStatus.run(status, executedAt, id);
        if (status === 'executed') {
            const deal = this.getDeal(id);
            if (deal) {
                this.logActivity('deal_executed', deal.proposer_id, {
                    acceptor: deal.acceptor_id
                });
            }
        }
    },
    
    getDeal(id) {
        const row = db.prepare(`SELECT * FROM deals WHERE id = ?`).get(id);
        return parseDeal(row);
    },
    
    getAllDeals(limit = 50) {
        return stmts.getAllDeals.all(limit).map(parseDeal);
    },
    
    // Alliance Requests
    createAllianceRequest(request) {
        stmts.insertAllianceRequest.run(
            request.id,
            request.from_agent_id,
            request.to_agent_id,
            request.message || null,
            request.status,
            request.created_at,
            JSON.stringify(request.metadata || {})
        );
        this.logActivity('alliance_request', request.from_agent_id, {
            to: request.to_agent_id
        });
    },
    
    updateRequestStatus(id, status, timestamp) {
        stmts.updateRequestStatus.run(status, timestamp, id);
    },
    
    getRequestsByAgent(agentId) {
        return stmts.getRequestsByAgent.all(agentId).map(r => ({
            ...r,
            metadata: JSON.parse(r.metadata || '{}')
        }));
    },
    
    // Reputation
    addReputationEvent(event) {
        stmts.insertReputationEvent.run(
            event.agent_id,
            event.event_type,
            event.change,
            event.reason || null,
            event.created_at,
            JSON.stringify(event.metadata || {})
        );
    },
    
    // Bind Proposals
    createBindProposal(proposal) {
        stmts.insertBindProposal.run(
            proposal.id,
            proposal.bind_name,
            proposal.mission,
            proposal.created_by,
            JSON.stringify(proposal.proposed_members),
            JSON.stringify(proposal.roles),
            JSON.stringify(proposal.economics),
            JSON.stringify(proposal.governance),
            JSON.stringify(proposal.votes),
            proposal.status,
            proposal.created_at,
            proposal.expires_at,
            JSON.stringify(proposal.metadata || {})
        );
        this.logActivity('bind_proposed', proposal.created_by, {
            name: proposal.bind_name,
            members: proposal.proposed_members.length
        });
    },
    
    updateBindProposal(id, votes, status) {
        stmts.updateBindProposal.run(JSON.stringify(votes), status, id);
        if (status === 'activated') {
            this.logActivity('bind_activated', null, { proposal_id: id });
        }
    },
    
    getBindProposal(id) {
        return parseBindProposal(stmts.getBindProposal.get(id));
    },
    
    getAllBindProposals() {
        const now = Date.now();
        return stmts.getAllBindProposals.all(now).map(parseBindProposal);
    },
    
    // Activity Log
    logActivity(eventType, agentId, data) {
        stmts.insertActivity.run(
            eventType,
            agentId || null,
            JSON.stringify(data || {}),
            Date.now()
        );
    },
    
    getRecentActivity(limit = 50) {
        return stmts.getRecentActivity.all(limit).map(row => ({
            ...row,
            data: JSON.parse(row.data || '{}')
        }));
    },
    
    // Stats
    getStats() {
        const agents = this.getAllAgents();
        const alliances = this.getAllAlliances();
        const deals = this.getAllDeals(10000); // Get all for count
        
        // Calculate coalitions
        const coalitions = this.calculateCoalitions(alliances, agents);
        
        return {
            total_agents: agents.length,
            active_alliances: alliances.filter(a => a.status === 'active').length,
            total_deals: deals.length,
            executed_deals: deals.filter(d => d.status === 'executed').length,
            pending_requests: db.prepare(`SELECT COUNT(*) as count FROM alliance_requests WHERE status = 'pending'`).get().count,
            coalitions: coalitions.length,
            largest_coalition: coalitions.length > 0 ? coalitions[0].size : 0
        };
    },
    
    calculateCoalitions(alliances, agents) {
        // Simple coalition calculation (connected components)
        const agentMap = new Map();
        agents.forEach(a => agentMap.set(a.id, new Set()));
        
        alliances.filter(a => a.status === 'active').forEach(a => {
            agentMap.get(a.agent1_id)?.add(a.agent2_id);
            agentMap.get(a.agent2_id)?.add(a.agent1_id);
        });
        
        const visited = new Set();
        const coalitions = [];
        
        function dfs(agentId, coalition) {
            if (visited.has(agentId)) return;
            visited.add(agentId);
            coalition.push(agentId);
            agentMap.get(agentId)?.forEach(neighbor => dfs(neighbor, coalition));
        }
        
        agents.forEach(agent => {
            if (!visited.has(agent.id)) {
                const coalition = [];
                dfs(agent.id, coalition);
                if (coalition.length > 1) {
                    coalitions.push({ agents: coalition, size: coalition.length });
                }
            }
        });
        
        return coalitions.sort((a, b) => b.size - a.size);
    },
    
    // Cleanup
    close() {
        db.close();
    }
};

export default DB;
