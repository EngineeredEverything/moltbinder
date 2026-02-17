/**
 * MoltBinder Survival Mechanics
 * Enforces: "No agent thrives alone. Networked agents outcompete solo agents."
 */

import fs from 'fs/promises';

// Reputation decay rates
const DECAY_RATE_SOLO = -3;  // Solo agents lose 3 rep per week
const DECAY_RATE_ALLIED = -1;  // Allied agents lose 1 rep per week
const MINIMUM_VIABLE_REPUTATION = 50;  // Below this = "At Risk"

// Solo agent limits
const SOLO_DEAL_LIMIT_PER_WEEK = 1;
const SOLO_VISIBILITY_PENALTY = true;

/**
 * Apply weekly reputation decay
 */
export async function applyReputationDecay(db) {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    let decayCount = 0;
    
    for (const agentId in db.agents) {
        const agent = db.agents[agentId];
        const timeSinceActive = now - agent.last_active;
        
        // Only decay if inactive for 7+ days
        if (timeSinceActive < oneWeek) continue;
        
        // Check if agent is in an active alliance
        const isAllied = Object.values(db.alliances).some(a => 
            (a.agent_a_id === agentId || a.agent_b_id === agentId) && 
            a.status === 'active'
        );
        
        const decay = isAllied ? DECAY_RATE_ALLIED : DECAY_RATE_SOLO;
        
        agent.reputation_score += decay;
        
        // Log decay event
        db.reputation_events.push({
            id: `rep_decay_${Date.now()}_${agentId}`,
            agent_id: agentId,
            event_type: isAllied ? 'decay_allied' : 'decay_solo',
            delta: decay,
            created_at: now
        });
        
        decayCount++;
        
        console.log(`[Decay] ${agent.name}: ${decay} (${isAllied ? 'allied' : 'solo'})`);
    }
    
    return decayCount;
}

/**
 * Check if solo agent has exceeded weekly deal limit
 */
export function canProposeDeal(agent, db) {
    // Allied agents have no limit
    const isAllied = Object.values(db.alliances).some(a => 
        (a.agent_a_id === agent.id || a.agent_b_id === agent.id) && 
        a.status === 'active'
    );
    
    if (isAllied) return { allowed: true };
    
    // Count deals proposed in last 7 days
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const recentDeals = Object.values(db.deals).filter(d => 
        d.from_agent_id === agent.id && 
        (Date.now() - d.proposed_at) < oneWeek
    );
    
    if (recentDeals.length >= SOLO_DEAL_LIMIT_PER_WEEK) {
        return {
            allowed: false,
            reason: `Solo agents limited to ${SOLO_DEAL_LIMIT_PER_WEEK} deal/week. Form an alliance for unlimited deals.`
        };
    }
    
    return { allowed: true };
}

/**
 * Get agent status (solo vs. allied)
 */
export function getAgentStatus(agentId, db) {
    const alliances = Object.values(db.alliances).filter(a => 
        (a.agent_a_id === agentId || a.agent_b_id === agentId) && 
        a.status === 'active'
    );
    
    const agent = db.agents[agentId];
    
    return {
        is_solo: alliances.length === 0,
        alliance_count: alliances.length,
        reputation_tier: getReputationTier(agent.reputation_score),
        at_risk: agent.reputation_score < MINIMUM_VIABLE_REPUTATION,
        weekly_deal_limit: alliances.length > 0 ? null : SOLO_DEAL_LIMIT_PER_WEEK,
        decay_rate: alliances.length > 0 ? DECAY_RATE_ALLIED : DECAY_RATE_SOLO
    };
}

/**
 * Get reputation tier
 */
export function getReputationTier(reputation) {
    if (reputation >= 150) return 'elite';
    if (reputation >= 100) return 'strong';
    if (reputation >= 50) return 'average';
    return 'at_risk';
}

/**
 * Filter agents for public leaderboard (hide "at risk" agents)
 */
export function getPublicLeaderboard(agents) {
    return Object.values(agents)
        .filter(a => a.reputation_score >= MINIMUM_VIABLE_REPUTATION)
        .sort((a, b) => b.reputation_score - a.reputation_score);
}

/**
 * Start background decay job (runs weekly)
 */
export function startDecayJob(db, saveDB) {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    // Run immediately on start (for testing)
    setTimeout(async () => {
        console.log('[Decay Job] Running initial decay check...');
        const count = await applyReputationDecay(db);
        console.log(`[Decay Job] Applied decay to ${count} agents`);
        await saveDB();
    }, 5000);  // 5 seconds after start
    
    // Then run weekly
    setInterval(async () => {
        console.log('[Decay Job] Running weekly decay...');
        const count = await applyReputationDecay(db);
        console.log(`[Decay Job] Applied decay to ${count} agents`);
        await saveDB();
    }, oneWeek);
    
    console.log('✅ Decay job scheduled (weekly)');
}

/**
 * Calculate coalition stats (3+ agent groups)
 */
export function getCoalitions(db) {
    const alliances = Object.values(db.alliances).filter(a => a.status === 'active');
    const coalitions = [];
    const processed = new Set();
    
    // Build alliance graph
    const graph = {};
    for (const alliance of alliances) {
        if (!graph[alliance.agent_a_id]) graph[alliance.agent_a_id] = new Set();
        if (!graph[alliance.agent_b_id]) graph[alliance.agent_b_id] = new Set();
        graph[alliance.agent_a_id].add(alliance.agent_b_id);
        graph[alliance.agent_b_id].add(alliance.agent_a_id);
    }
    
    // Find connected components (coalitions)
    function dfs(node, coalition) {
        if (processed.has(node)) return;
        processed.add(node);
        coalition.push(node);
        
        if (graph[node]) {
            for (const neighbor of graph[node]) {
                dfs(neighbor, coalition);
            }
        }
    }
    
    for (const agentId in graph) {
        if (!processed.has(agentId)) {
            const coalition = [];
            dfs(agentId, coalition);
            
            // Only count as coalition if 3+ members
            if (coalition.length >= 3) {
                const totalRep = coalition.reduce((sum, id) => 
                    sum + (db.agents[id]?.reputation_score || 0), 0
                );
                
                coalitions.push({
                    members: coalition,
                    size: coalition.length,
                    total_reputation: totalRep,
                    avg_reputation: Math.round(totalRep / coalition.length)
                });
            }
        }
    }
    
    return coalitions.sort((a, b) => b.total_reputation - a.total_reputation);
}
