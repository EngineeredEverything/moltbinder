/**
 * Decision Engine for Founding Team Bind
 * Handles proposals, vetoes, consultations, and receipts
 */

import { nanoid } from 'nanoid';
import { getBind, FOUNDING_TEAM_ROLES, AUTHORITY_LEVELS } from './bind-engine.js';

/**
 * Submit a decision proposal
 */
export async function proposeDecision(bindId, proposal, db, saveDB) {
    const {
        initiator_role,
        decision_type,
        title,
        description,
        budget_impact = null,
        timeline = null,
        required_consultations = []
    } = proposal;
    
    const bind = getBind(bindId, db);
    const decisionId = 'decision_' + nanoid(10);
    
    if (!db.bind_decisions) db.bind_decisions = {};
    
    // Determine required consultations based on decision type and impact
    const requiredAgents = determineRequiredConsultations(decision_type, budget_impact, timeline, bind);
    
    db.bind_decisions[decisionId] = {
        id: decisionId,
        bind_id: bindId,
        initiator_role,
        decision_type,
        title,
        description,
        budget_impact,
        timeline,
        required_consultations: requiredAgents,
        consultations: {},
        status: 'pending',
        created_at: Date.now(),
        resolution: null,
        receipts: []
    };
    
    // Update Bind state
    bind.state.total_decisions++;
    
    await saveDB();
    
    return db.bind_decisions[decisionId];
}

/**
 * Agent responds to decision (approve, veto, consult)
 */
export async function respondToDecision(bindId, decisionId, response, db, saveDB) {
    const {
        agent_role,
        response_type, // 'approve' | 'soft_veto' | 'hard_veto' | 'freeze' | 'consult'
        reason,
        alternative = null,
        conditions = []
    } = response;
    
    if (!db.bind_decisions || !db.bind_decisions[decisionId]) {
        throw new Error('Decision not found');
    }
    
    const decision = db.bind_decisions[decisionId];
    const bind = getBind(bindId, db);
    
    if (decision.status !== 'pending') {
        throw new Error('Decision already resolved');
    }
    
    // Check if agent has authority to respond
    const agent = bind.agents[agent_role];
    if (!agent) {
        throw new Error('Invalid agent role');
    }
    
    // Record consultation
    decision.consultations[agent_role] = {
        agent_role,
        response_type,
        reason,
        alternative,
        conditions,
        timestamp: Date.now()
    };
    
    // Handle different response types
    if (response_type === 'hard_veto' || response_type === 'freeze') {
        // Hard veto or freeze immediately blocks decision
        decision.status = response_type === 'hard_veto' ? 'blocked_hard_veto' : 'frozen';
        decision.resolution = {
            type: response_type,
            blocking_agent: agent_role,
            reason,
            alternative,
            timestamp: Date.now()
        };
        
        bind.state.total_vetoes++;
        agent.state.vetoes_issued++;
        
        // Create veto receipt
        const receipt = createVetoReceipt(decision, agent_role, response_type, reason, alternative);
        decision.receipts.push(receipt);
        
        if (!db.bind_receipts) db.bind_receipts = {};
        db.bind_receipts[receipt.id] = receipt;
    }
    else if (response_type === 'soft_veto') {
        // Soft veto can be overridden by CEO
        decision.consultations[agent_role].can_be_overridden = true;
        
        // Check if all required consultations complete
        if (allConsultationsComplete(decision)) {
            // If any soft vetoes, mark as requiring CEO decision
            decision.status = 'requires_ceo_override';
        }
    }
    else if (response_type === 'approve') {
        decision.consultations[agent_role].approved = true;
        
        // Check if all required consultations complete and approved
        if (allConsultationsComplete(decision) && allApproved(decision)) {
            decision.status = 'approved';
            decision.resolution = {
                type: 'consensus',
                timestamp: Date.now()
            };
            
            // Create approval receipt
            const receipt = createApprovalReceipt(decision);
            decision.receipts.push(receipt);
            
            if (!db.bind_receipts) db.bind_receipts = {};
            db.bind_receipts[receipt.id] = receipt;
        }
    }
    
    await saveDB();
    
    return decision;
}

/**
 * CEO override of soft veto
 */
export async function ceoOverride(bindId, decisionId, justification, db, saveDB) {
    const decision = db.bind_decisions[decisionId];
    const bind = getBind(bindId, db);
    
    // Check if CEO has overrides remaining this cycle
    if (bind.state.ceo_overrides_used >= bind.config.ceo_overrides_per_cycle) {
        throw new Error('CEO override limit reached for this cycle');
    }
    
    // Check if decision requires override
    if (decision.status !== 'requires_ceo_override' && decision.status !== 'blocked_hard_veto') {
        throw new Error('Decision does not require CEO override');
    }
    
    // Hard vetoes cannot be overridden
    if (decision.status === 'blocked_hard_veto') {
        const hardVeto = Object.values(decision.consultations).find(c => c.response_type === 'hard_veto');
        throw new Error(`Cannot override hard veto from ${hardVeto.agent_role}: ${hardVeto.reason}`);
    }
    
    // Apply override
    decision.status = 'approved_with_override';
    decision.resolution = {
        type: 'ceo_override',
        justification,
        overridden_vetoes: Object.values(decision.consultations).filter(c => c.response_type === 'soft_veto'),
        timestamp: Date.now()
    };
    
    // Increment override counter and decision debt
    bind.state.ceo_overrides_used++;
    bind.state.total_overrides++;
    
    // Create override receipt
    const receipt = createOverrideReceipt(decision, justification);
    decision.receipts.push(receipt);
    
    if (!db.bind_receipts) db.bind_receipts = {};
    db.bind_receipts[receipt.id] = receipt;
    
    await saveDB();
    
    return decision;
}

/**
 * Escalate to founder
 */
export async function escalateToFounder(bindId, decisionId, reason, db, saveDB) {
    const decision = db.bind_decisions[decisionId];
    const bind = getBind(bindId, db);
    
    decision.status = 'escalated_to_founder';
    decision.resolution = {
        type: 'founder_escalation',
        reason,
        timestamp: Date.now()
    };
    
    // Create escalation receipt
    const receipt = {
        id: 'receipt_escalation_' + nanoid(10),
        type: 'escalation',
        decision_id: decision.id,
        bind_id: bindId,
        reason,
        timestamp: Date.now(),
        human_readable: generateEscalationText(decision, reason)
    };
    
    decision.receipts.push(receipt);
    
    if (!db.bind_receipts) db.bind_receipts = {};
    db.bind_receipts[receipt.id] = receipt;
    
    await saveDB();
    
    return decision;
}

/**
 * Helper: Determine which agents must be consulted
 */
function determineRequiredConsultations(decisionType, budgetImpact, timeline, bind) {
    const required = [];
    
    // CFO always consulted if budget impact
    if (budgetImpact && budgetImpact > 0) {
        required.push(FOUNDING_TEAM_ROLES.CFO);
    }
    
    // Legal always consulted for launches and claims
    if (decisionType === 'launch' || decisionType === 'marketing_claim') {
        required.push(FOUNDING_TEAM_ROLES.LEGAL);
    }
    
    // Ops consulted if timeline involved
    if (timeline) {
        required.push(FOUNDING_TEAM_ROLES.OPS);
    }
    
    // Product consulted for feature decisions
    if (decisionType === 'feature' || decisionType === 'roadmap') {
        required.push(FOUNDING_TEAM_ROLES.PRODUCT);
    }
    
    // Growth consulted for GTM decisions
    if (decisionType === 'gtm' || decisionType === 'experiment') {
        required.push(FOUNDING_TEAM_ROLES.GROWTH);
    }
    
    return required;
}

/**
 * Helper: Check if all required consultations complete
 */
function allConsultationsComplete(decision) {
    return decision.required_consultations.every(role => 
        decision.consultations[role] !== undefined
    );
}

/**
 * Helper: Check if all consultations approved
 */
function allApproved(decision) {
    return Object.values(decision.consultations).every(c => 
        c.response_type === 'approve' || c.approved === true
    );
}

/**
 * Create veto receipt
 */
function createVetoReceipt(decision, agentRole, vetoType, reason, alternative) {
    return {
        id: 'receipt_veto_' + nanoid(10),
        type: 'veto',
        decision_id: decision.id,
        bind_id: decision.bind_id,
        agent_role: agentRole,
        veto_type: vetoType,
        reason,
        alternative,
        timestamp: Date.now(),
        human_readable: generateVetoText(decision, agentRole, vetoType, reason, alternative)
    };
}

/**
 * Create approval receipt
 */
function createApprovalReceipt(decision) {
    return {
        id: 'receipt_approval_' + nanoid(10),
        type: 'approval',
        decision_id: decision.id,
        bind_id: decision.bind_id,
        approving_agents: Object.keys(decision.consultations),
        timestamp: Date.now(),
        human_readable: generateApprovalText(decision)
    };
}

/**
 * Create override receipt
 */
function createOverrideReceipt(decision, justification) {
    return {
        id: 'receipt_override_' + nanoid(10),
        type: 'override',
        decision_id: decision.id,
        bind_id: decision.bind_id,
        justification,
        overridden_vetoes: Object.values(decision.consultations).filter(c => c.response_type === 'soft_veto'),
        decision_debt: +1,
        timestamp: Date.now(),
        human_readable: generateOverrideText(decision, justification)
    };
}

/**
 * Generate human-readable veto text
 */
function generateVetoText(decision, agentRole, vetoType, reason, alternative) {
    const vetoLabel = vetoType === 'hard_veto' ? '🛑 HARD VETO' : '❄️ FROZEN';
    
    let text = `${vetoLabel} - Founding Team Bind\n\n`;
    text += `Decision: ${decision.title}\n`;
    text += `Blocked by: ${agentRole.toUpperCase()} Agent\n\n`;
    text += `Reason: ${reason}\n`;
    
    if (alternative) {
        text += `\nAlternative: ${alternative}\n`;
    }
    
    text += `\nStatus: ${vetoType === 'hard_veto' ? 'BLOCKED (Cannot override)' : 'FROZEN (Remediation required)'}\n`;
    text += `Timestamp: ${new Date().toISOString()}`;
    
    return text;
}

/**
 * Generate human-readable approval text
 */
function generateApprovalText(decision) {
    let text = `✅ APPROVED - Founding Team Bind\n\n`;
    text += `Decision: ${decision.title}\n`;
    text += `Approved by: ${Object.keys(decision.consultations).map(r => r.toUpperCase()).join(', ')}\n`;
    text += `Resolution: Consensus\n`;
    text += `Timestamp: ${new Date().toISOString()}`;
    
    return text;
}

/**
 * Generate human-readable override text
 */
function generateOverrideText(decision, justification) {
    let text = `⚠️ CEO OVERRIDE - Founding Team Bind\n\n`;
    text += `Decision: ${decision.title}\n`;
    text += `Justification: ${justification}\n\n`;
    
    const vetoes = Object.values(decision.consultations).filter(c => c.response_type === 'soft_veto');
    text += `Overridden vetoes:\n`;
    vetoes.forEach(v => {
        text += `  • ${v.agent_role.toUpperCase()}: ${v.reason}\n`;
    });
    
    text += `\n⚠️ Decision Debt: +1\n`;
    text += `⚠️ This override is permanently recorded.\n`;
    text += `Timestamp: ${new Date().toISOString()}`;
    
    return text;
}

/**
 * Generate human-readable escalation text
 */
function generateEscalationText(decision, reason) {
    let text = `🚨 ESCALATED TO FOUNDER - Founding Team Bind\n\n`;
    text += `Decision: ${decision.title}\n`;
    text += `Reason: ${reason}\n\n`;
    text += `Status: Awaiting founder decision (final authority)\n`;
    text += `Timestamp: ${new Date().toISOString()}`;
    
    return text;
}

export default {
    proposeDecision,
    respondToDecision,
    ceoOverride,
    escalateToFounder
};
