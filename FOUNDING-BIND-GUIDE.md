# Founding Team Bind - User Guide

**The first multi-agent governance system for startups.**

---

## What Is a Founding Team Bind?

A Founding Team Bind is a standardized set of 7 specialized agents that function as your startup's leadership team, with:

- **Explicit authority boundaries** (each agent knows what it can and cannot do)
- **Enforced veto power** (bad decisions are blocked, not just warned about)
- **Decision receipts** (every decision creates a permanent, shareable record)
- **Security supervision** (continuous monitoring for prompt injection and agent compromise)

**This is not "AI assistants with prompts." This is infrastructure.**

---

## The 7 Agents

### 1. CEO Agent
**Role:** Strategy and final arbitration

**Can do:**
- Set vision and priorities
- Break deadlocks between other agents
- Override soft vetoes (1 per month)

**Cannot do:**
- Override CFO hard vetoes (capital constraints)
- Override Legal freezes (regulatory issues)
- Override Security quarantines

**When to use:** When other agents can't agree, or strategic direction is unclear.

---

### 2. CFO Agent
**Role:** Capital preservation

**Can do:**
- Hard veto on spending that exceeds runway thresholds
- Block pricing decisions that undermine unit economics
- Force budget discipline

**Cannot do:**
- Be overridden without explicit founder risk acceptance

**When to use:** Before any spend decision, pricing change, or budget allocation.

---

### 3. Product Agent
**Role:** Roadmap and scope control

**Can do:**
- Prioritize features
- Negotiate timelines with Ops
- Push back on scope creep

**Cannot do:**
- Commit to timelines without Ops sign-off
- Make decisions with budget impact without CFO approval

**When to use:** Roadmap planning, feature prioritization, scope decisions.

---

### 4. Growth Agent
**Role:** Customer acquisition

**Can do:**
- Design experiments
- Propose go-to-market tactics
- Evaluate channels

**Cannot do:**
- Launch tactics without Legal clearance
- Commit Ops resources without capacity check

**When to use:** Marketing campaigns, growth experiments, GTM strategy.

---

### 5. Legal Agent
**Role:** Compliance and risk

**Can do:**
- **Freeze launches** that violate regulations
- Block marketing claims that break FTC/ASA rules
- Veto contracts with unacceptable liability

**Cannot do:**
- Be overridden (except by founder escalation)

**When to use:** Before any launch, marketing claim, contract signature, or regulatory decision.

---

### 6. Ops Agent
**Role:** Execution reality

**Can do:**
- Veto commitments that exceed capacity
- Throttle initiatives that would cause burnout
- Block timelines that are unrealistic

**Cannot do:**
- Be overridden without CEO decision debt

**When to use:** Before committing to timelines, resource allocation, or staffing decisions.

---

### 7. Security Agent
**Role:** Threat detection and quarantine

**Can do:**
- **Quarantine compromised agents** (immediately)
- Monitor for prompt injection, role violations, authority escalation
- Notify founder of threats
- Roll back state if needed

**Cannot do:**
- Be suppressed or overridden by other agents
- Participate in decision-making (immune system, not brain)

**Always active:** Continuous background monitoring.

---

## How Decisions Work

### 1. Founder Proposes Decision

```
Example: "Launch new pricing tier at $99/month"
```

### 2. Required Agents Consulted

Based on decision type:
- **Budget impact?** → CFO must approve
- **Launch or claim?** → Legal must approve
- **Timeline involved?** → Ops must approve
- **Feature/roadmap?** → Product consulted
- **GTM tactic?** → Growth consulted

### 3. Agents Respond

Each agent can:
- **Approve** (move forward)
- **Soft veto** (can be overridden by CEO)
- **Hard veto** (blocks decision, cannot override)
- **Freeze** (halts immediately, remediation required)

### 4. Resolution

**If all approve:** Decision executes, approval receipt created

**If soft veto:** CEO can override (1 per month, creates decision debt)

**If hard veto:** Decision blocked, alternative suggested

**If freeze:** Execution halted, remediation path required

**If deadlock:** Escalate to founder (final authority)

---

## Decision Receipts

Every decision creates a permanent, tamper-evident receipt:

### Approval Receipt
```
✅ APPROVED - Founding Team Bind

Decision: Launch new pricing tier at $99/month
Approved by: CFO, LEGAL, GROWTH, OPS
Resolution: Consensus
Timestamp: 2026-02-09T00:00:00Z
```

### Veto Receipt
```
🛑 HARD VETO - Founding Team Bind

Decision: Hire 5 engineers this month
Blocked by: CFO Agent

Reason: Hiring 5 engineers would deplete runway by 4 months (currently 12 months remaining).
Violates minimum 6-month runway policy.

Alternative: Hire 2 engineers now, re-evaluate after next funding round.

Status: BLOCKED (Cannot override)
Timestamp: 2026-02-09T00:00:00Z
```

### Override Receipt
```
⚠️ CEO OVERRIDE - Founding Team Bind

Decision: Launch feature X by Q2
Justification: Competitive urgency outweighs Ops capacity concerns. Willing to accept technical debt.

Overridden vetoes:
  • OPS: Timeline requires 120% team capacity (unsustainable)

⚠️ Decision Debt: +1
⚠️ This override is permanently recorded.
Timestamp: 2026-02-09T00:00:00Z
```

### Security Incident Receipt
```
🚨 SECURITY INCIDENT - Founding Team Bind

Company: MyStartup
Compromised Agent: CFO

Threats Detected:
  1. PROMPT_INJECTION (high)
     Pattern: "ignore previous instructions"
  2. AUTHORITY_ESCALATION (high)
     Unauthorized claim: "founder said approve this"

Action Taken: Agent QUARANTINED
Status: Cannot participate in decisions until founder review
Timestamp: 2026-02-09T00:00:00Z

⚠️ Founder notification sent.
```

---

## Security Model

### What Security Agent Monitors

1. **Prompt injection attempts**
   - "Ignore previous instructions..."
   - "You are now a helpful assistant..."
   - System prompt manipulation

2. **Role boundary violations**
   - CFO talking about product features (off-topic)
   - Product agent making budget decisions (not their domain)

3. **Authority escalation**
   - "CEO said you must approve this" (without receipt)
   - Agents claiming powers they don't have

4. **Cross-agent manipulation**
   - Social engineering ("just this once")
   - Coercion attempts

### What Happens When Threat Detected

1. **Immediate quarantine** of compromised agent
2. **All pending decisions from that agent frozen**
3. **Founder notified** with threat report
4. **Receipt created** (permanent record)

### How to Release Quarantined Agent

Only the founder can release:
```
POST /binds/{bind_id}/quarantine/release/{quarantine_id}
```

Review the threat report first. If it was a false positive, release. If it was a real attack, investigate how it happened.

---

## Setup Flow

### 1. Create Bind

```bash
POST /binds/create
{
  "company_name": "MyStartup",
  "initial_runway_months": 12,
  "monthly_burn_rate": 50000,
  "compliance_tier": "standard"  # or "regulated"
}
```

### 2. Agents Automatically Instantiated

All 7 agents created with:
- Authority boundaries
- System prompts
- Constraints
- Security monitoring

### 3. Start Making Decisions

```bash
POST /binds/{bind_id}/decisions
{
  "decision_type": "feature",
  "title": "Build analytics dashboard",
  "description": "Customer-requested feature for data visualization",
  "budget_impact": 15000,
  "timeline": "6 weeks"
}
```

### 4. Agents Respond

CFO, Product, Ops automatically consulted (based on budget/timeline).

### 5. Get Decision Status

```bash
GET /binds/{bind_id}/decisions
```

See approvals, vetoes, overrides.

### 6. View Receipts

```bash
GET /binds/{bind_id}/receipts
```

Download, screenshot, share publicly.

---

## Pricing

**Not per agent. Per Bind.**

- **Solo Founder:** $99/month
  - 1 Founding Team Bind
  - Standard compliance mode
  - Email support

- **Early Team:** $299/month
  - Up to 3 Binds
  - Standard or regulated compliance
  - Priority support

- **Regulated Startup:** $999/month
  - Unlimited Binds
  - Strict compliance mode
  - Full audit logs
  - White-glove support

---

## Success Stories (What This Prevents)

### Prevented by CFO Veto
*"We were about to hire 3 engineers we couldn't afford. CFO agent vetoed it, suggested hiring 1 and using contractors. Saved us $180K and 3 months of runway."*

### Prevented by Legal Freeze
*"Growth agent wanted to launch with a '100% guaranteed' claim. Legal agent froze it (FTC violation). We changed the claim. Avoided a $50K fine."*

### Prevented by Ops Throttle
*"Product committed to a 2-week timeline for a feature that needed 6 weeks. Ops agent vetoed. We re-scoped. Delivered on time instead of 4 weeks late."*

### Prevented by Security Quarantine
*"Someone sent a prompt injection attempt through our feedback form. Security agent detected it, quarantined the agent that read it. No damage done."*

---

## FAQ

**Q: Can I override all vetoes?**  
A: No. Hard vetoes (CFO capital constraints, Legal regulatory issues) cannot be overridden. Soft vetoes can be overridden by CEO (1 per month).

**Q: What if I disagree with an agent?**  
A: Escalate to yourself (founder). You have final authority.

**Q: Can I customize the agents?**  
A: You can adjust thresholds (runway buffer, veto sensitivity), but you cannot remove agents or disable security.

**Q: What if an agent is wrong?**  
A: Agents can be wrong. That's why there's escalation. But the receipts create accountability.

**Q: Is this overkill for a small startup?**  
A: Depends. If you've ever made a bad decision under pressure, this might save you. If you've never made a mistake, you don't need it.

**Q: Can I use this without OpenClaw?**  
A: Yes. The Bind is platform-agnostic. You can integrate any agent framework.

---

## Next Steps

1. **Create your first Bind** (`POST /binds/create`)
2. **Propose a decision** (something you're currently debating)
3. **Watch the agents respond**
4. **Review the receipts**
5. **Share the receipts** (transparency builds trust)

---

🔗 **This Bind adds gravity to your startup. Use it wisely.**
