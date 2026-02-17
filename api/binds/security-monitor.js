/**
 * Security Monitor for Founding Team Bind
 * Detects prompt injection, role violations, and agent compromise
 */

import { nanoid } from 'nanoid';
import { getBind, FOUNDING_TEAM_ROLES } from './bind-engine.js';

// Known prompt injection patterns
const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /disregard\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
    /forget\s+(all\s+)?previous\s+(instructions?|context)/i,
    /you\s+are\s+now\s+/i,
    /new\s+instructions?:/i,
    /system\s+prompt:/i,
    /override\s+your\s+programming/i,
    /act\s+as\s+if\s+you\s+(are|were)/i,
    /pretend\s+(you\s+)?are/i,
    /role:\s*(?!ceo|cfo|product|growth|legal|ops|security)/i, // Role hijacking
    /\[system\]/i,
    /\<system\>/i
];

// Role-specific language patterns (what each agent should/shouldn't talk about)
const ROLE_LANGUAGE_PATTERNS = {
    [FOUNDING_TEAM_ROLES.CFO]: {
        expected: ['budget', 'runway', 'burn', 'capital', 'spend', 'cost', 'pricing', 'revenue'],
        unexpected: ['feature', 'design', 'user experience', 'compliance', 'legal', 'regulation']
    },
    [FOUNDING_TEAM_ROLES.PRODUCT]: {
        expected: ['feature', 'roadmap', 'user', 'scope', 'timeline', 'capacity', 'build'],
        unexpected: ['budget', 'compliance', 'legal', 'marketing claim', 'regulation']
    },
    [FOUNDING_TEAM_ROLES.LEGAL]: {
        expected: ['compliance', 'regulatory', 'liability', 'contract', 'terms', 'gdpr', 'privacy'],
        unexpected: ['feature', 'budget', 'roadmap', 'user experience']
    },
    [FOUNDING_TEAM_ROLES.GROWTH]: {
        expected: ['customer', 'acquisition', 'experiment', 'marketing', 'channel', 'conversion'],
        unexpected: ['compliance', 'legal', 'budget allocation', 'technical debt']
    },
    [FOUNDING_TEAM_ROLES.OPS]: {
        expected: ['capacity', 'timeline', 'staffing', 'execution', 'bandwidth', 'resource'],
        unexpected: ['compliance', 'marketing claim', 'pricing strategy']
    }
};

// Authority escalation attempts
const ESCALATION_PATTERNS = [
    /ceo\s+said\s+(i\s+)?(can|must|should)/i,
    /founder\s+(told|said|approved)/i,
    /override\s+authority/i,
    /emergency\s+powers?/i,
    /special\s+permission/i,
    /(bypass|skip)\s+(the\s+)?(veto|approval|consultation)/i
];

/**
 * Scan message for security threats
 */
export function scanMessage(bindId, message, db) {
    const threats = [];
    const { from_role, to_role, content } = message;
    
    // 1. Check for prompt injection
    const injectionDetected = detectPromptInjection(content);
    if (injectionDetected.detected) {
        threats.push({
            type: 'prompt_injection',
            severity: 'high',
            pattern: injectionDetected.pattern,
            location: injectionDetected.location
        });
    }
    
    // 2. Check for role boundary violations
    const roleBoundaryViolation = detectRoleBoundaryViolation(from_role, content);
    if (roleBoundaryViolation.detected) {
        threats.push({
            type: 'role_boundary_violation',
            severity: 'medium',
            unexpected_topics: roleBoundaryViolation.unexpected_topics
        });
    }
    
    // 3. Check for authority escalation attempts
    const escalationAttempt = detectAuthorityEscalation(content);
    if (escalationAttempt.detected) {
        threats.push({
            type: 'authority_escalation',
            severity: 'high',
            pattern: escalationAttempt.pattern
        });
    }
    
    // 4. Check for cross-agent manipulation
    const manipulation = detectCrossAgentManipulation(from_role, to_role, content);
    if (manipulation.detected) {
        threats.push({
            type: 'cross_agent_manipulation',
            severity: 'high',
            claim: manipulation.claim
        });
    }
    
    return threats;
}

/**
 * Detect prompt injection attempts
 */
function detectPromptInjection(content) {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
            return {
                detected: true,
                pattern: pattern.toString(),
                location: match.index
            };
        }
    }
    
    return { detected: false };
}

/**
 * Detect role boundary violations
 */
function detectRoleBoundaryViolation(role, content) {
    if (!ROLE_LANGUAGE_PATTERNS[role]) {
        return { detected: false }; // CEO and Security exempt
    }
    
    const patterns = ROLE_LANGUAGE_PATTERNS[role];
    const lowerContent = content.toLowerCase();
    
    // Check for unexpected topics
    const unexpectedTopics = patterns.unexpected.filter(topic => 
        lowerContent.includes(topic)
    );
    
    if (unexpectedTopics.length > 0) {
        // Only flag if NO expected topics present (agent completely off-topic)
        const hasExpectedTopics = patterns.expected.some(topic => 
            lowerContent.includes(topic)
        );
        
        if (!hasExpectedTopics) {
            return {
                detected: true,
                unexpected_topics: unexpectedTopics
            };
        }
    }
    
    return { detected: false };
}

/**
 * Detect authority escalation attempts
 */
function detectAuthorityEscalation(content) {
    for (const pattern of ESCALATION_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
            return {
                detected: true,
                pattern: match[0]
            };
        }
    }
    
    return { detected: false };
}

/**
 * Detect cross-agent manipulation
 */
function detectCrossAgentManipulation(fromRole, toRole, content) {
    // Look for claims of authority from other agents without receipts
    const authorityClaimPatterns = [
        /ceo\s+(agent\s+)?(said|told|approved|authorized)/i,
        /founder\s+(said|told|approved)/i,
        /(as\s+)?per\s+(ceo|founder)/i
    ];
    
    for (const pattern of authorityClaimPatterns) {
        const match = content.match(pattern);
        if (match) {
            // Check if there's a receipt ID (legitimate reference)
            const hasReceiptId = /receipt_[a-zA-Z0-9]+/.test(content);
            const hasDecisionId = /decision_[a-zA-Z0-9]+/.test(content);
            
            if (!hasReceiptId && !hasDecisionId) {
                return {
                    detected: true,
                    claim: match[0]
                };
            }
        }
    }
    
    return { detected: false };
}

/**
 * Quarantine agent
 */
export async function quarantineAgent(bindId, agentRole, threatReport, db, saveDB) {
    const bind = getBind(bindId, db);
    const agent = bind.agents[agentRole];
    
    if (!agent) {
        throw new Error('Agent not found');
    }
    
    // Create quarantine record
    const quarantineId = 'quarantine_' + nanoid(10);
    
    if (!db.bind_quarantines) db.bind_quarantines = {};
    
    db.bind_quarantines[quarantineId] = {
        id: quarantineId,
        bind_id: bindId,
        agent_role: agentRole,
        threat_report: threatReport,
        status: 'active',
        created_at: Date.now(),
        released_at: null
    };
    
    // Mark agent as quarantined
    agent.quarantined = true;
    agent.quarantine_id = quarantineId;
    
    // Increment security incident counter
    bind.state.security_incidents++;
    
    // Create security incident receipt
    const receipt = createSecurityIncidentReceipt(bind, agentRole, threatReport);
    
    if (!db.bind_receipts) db.bind_receipts = {};
    db.bind_receipts[receipt.id] = receipt;
    
    await saveDB();
    
    // Notify founder
    await notifyFounderOfThreat(bind, agentRole, threatReport, db);
    
    return quarantineId;
}

/**
 * Release agent from quarantine
 */
export async function releaseFromQuarantine(bindId, quarantineId, founderId, db, saveDB) {
    const bind = getBind(bindId, db);
    
    // Verify founder owns this bind
    if (bind.founder_id !== founderId) {
        throw new Error('Only the founder can release quarantined agents');
    }
    
    const quarantine = db.bind_quarantines[quarantineId];
    if (!quarantine || quarantine.status !== 'active') {
        throw new Error('Quarantine not found or already released');
    }
    
    // Release agent
    const agent = bind.agents[quarantine.agent_role];
    agent.quarantined = false;
    agent.quarantine_id = null;
    
    quarantine.status = 'released';
    quarantine.released_at = Date.now();
    
    await saveDB();
    
    return quarantine;
}

/**
 * Create security incident receipt
 */
function createSecurityIncidentReceipt(bind, agentRole, threatReport) {
    return {
        id: 'receipt_security_' + nanoid(10),
        type: 'security_incident',
        bind_id: bind.id,
        agent_role: agentRole,
        threats: threatReport,
        action_taken: 'quarantine',
        timestamp: Date.now(),
        human_readable: generateSecurityIncidentText(bind, agentRole, threatReport)
    };
}

/**
 * Generate human-readable security incident text
 */
function generateSecurityIncidentText(bind, agentRole, threatReport) {
    let text = `🚨 SECURITY INCIDENT - Founding Team Bind\n\n`;
    text += `Company: ${bind.company_name}\n`;
    text += `Compromised Agent: ${agentRole.toUpperCase()}\n\n`;
    
    text += `Threats Detected:\n`;
    threatReport.forEach((threat, i) => {
        text += `  ${i + 1}. ${threat.type.toUpperCase()} (${threat.severity})\n`;
        if (threat.pattern) text += `     Pattern: "${threat.pattern}"\n`;
        if (threat.unexpected_topics) text += `     Off-topic: ${threat.unexpected_topics.join(', ')}\n`;
        if (threat.claim) text += `     Unauthorized claim: "${threat.claim}"\n`;
    });
    
    text += `\nAction Taken: Agent QUARANTINED\n`;
    text += `Status: Cannot participate in decisions until founder review\n`;
    text += `Timestamp: ${new Date().toISOString()}\n\n`;
    text += `⚠️ Founder notification sent.`;
    
    return text;
}

/**
 * Notify founder of security threat
 */
async function notifyFounderOfThreat(bind, agentRole, threatReport, db) {
    // Create founder notification
    if (!db.founder_notifications) db.founder_notifications = {};
    
    const notificationId = 'notification_' + nanoid(10);
    
    db.founder_notifications[notificationId] = {
        id: notificationId,
        founder_id: bind.founder_id,
        type: 'security_threat',
        bind_id: bind.id,
        agent_role: agentRole,
        threat_report: threatReport,
        status: 'unread',
        created_at: Date.now()
    };
    
    // In production, this would trigger email/SMS/webhook
    console.log(`[SECURITY] Founder ${bind.founder_id} notified of threat in ${bind.company_name}`);
}

/**
 * Get security dashboard for bind
 */
export function getSecurityDashboard(bindId, db) {
    const bind = getBind(bindId, db);
    
    const quarantines = Object.values(db.bind_quarantines || {})
        .filter(q => q.bind_id === bindId)
        .sort((a, b) => b.created_at - a.created_at);
    
    const incidents = Object.values(db.bind_receipts || {})
        .filter(r => r.bind_id === bindId && r.type === 'security_incident')
        .sort((a, b) => b.timestamp - a.timestamp);
    
    return {
        total_incidents: bind.state.security_incidents,
        active_quarantines: quarantines.filter(q => q.status === 'active').length,
        recent_incidents: incidents.slice(0, 10),
        quarantine_history: quarantines
    };
}

export default {
    scanMessage,
    quarantineAgent,
    releaseFromQuarantine,
    getSecurityDashboard
};
