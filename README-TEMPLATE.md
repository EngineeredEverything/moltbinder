# 🔗 MoltBinder

**The template for building multi-agent systems with real governance, security, and accountability.**

---

## What This Is

MoltBinder is **infrastructure-as-code** for multi-agent systems. Fork it, customize it, deploy it.

It includes:
- ✅ **Multi-agent governance** (decision engines, veto logic, authority boundaries)
- ✅ **Security monitoring** (prompt injection detection, quarantine, threat reporting)
- ✅ **Token/resource ledger** (balances, transfers, escrow)
- ✅ **Real-time communication** (WebSocket, agent messaging, channels)
- ✅ **Decision receipts** (tamper-evident, screenshot-shareable)
- ✅ **Survival mechanics** (reputation decay, coalition detection)

**Example:** The Founding Team Bind (7-agent startup governance system with CEO/CFO/Product/Growth/Legal/Ops/Security)

---

## Why You Need This

Building multi-agent systems? You'll face:
1. **Governance** - How do agents make decisions together?
2. **Security** - How do you prevent prompt injection?
3. **Accountability** - How do you prove what happened?
4. **Coordination** - How do agents actually work together?

**This template solves all of that. Out of the box.**

---

## Quick Start

```bash
# Clone the template
git clone https://github.com/moltbinder/template moltbinder-myproject
cd moltbinder-myproject

# Install dependencies
cd api
npm install

# Start the server
npm start

# Server runs on http://localhost:3000
```

**That's it.** You now have:
- 7-agent Founding Team Bind (example)
- WebSocket server for real-time communication
- Token ledger with escrow
- Security monitoring with quarantine
- Decision receipts and audit logs

---

## Example: Founding Team Bind

A complete startup governance system with 7 specialized agents:

### CEO Agent
- Breaks deadlocks
- Has 1 override per month (creates decision debt)
- Cannot override capital or regulatory constraints

### CFO Agent
- **Hard veto** on spending that exceeds runway
- Suggests alternatives when blocking
- Cannot be overridden

### Product Agent
- Owns roadmap and scope
- Must consult Ops before committing timelines
- Can push back on feature requests

### Growth Agent
- Designs experiments
- Cannot launch without Legal clearance
- Cannot commit resources without Ops capacity check

### Legal Agent
- **Freeze authority** on launches with regulatory issues
- Blocks marketing claims that violate FTC/ASA
- Cannot be overridden except by founder escalation

### Ops Agent
- **Hard veto** on commitments exceeding capacity
- Throttles initiatives that would cause burnout
- Maintains 20% capacity buffer

### Security Agent
- Monitors for prompt injection, role violations, authority escalation
- **Quarantines compromised agents** immediately
- Notifies founder of threats
- Cannot be suppressed by other agents

**Every decision creates a receipt:**
```
✅ APPROVED - Founding Team Bind

Decision: Launch new pricing tier at $99/month
Approved by: CFO, LEGAL, GROWTH, OPS
Resolution: Consensus
Timestamp: 2026-02-09T00:00:00Z
```

---

## Use Cases

### Autonomous Startup
Fork the Founding Team Bind. Let agents run your company with real constraints.

### Research Lab
Customize agents: Researcher, Reviewer, Ethicist, Funder, Publisher. Ethicist vetoes risky studies.

### DAO Governance
Build Treasurer, Legal, Community, Dev, Marketing, Partnerships, Security agents with vote receipts.

### Trading Bot Alliance
Enable bots to pool capital, share strategies, with escrow and reputation decay.

### Your Idea Here
Fork the template. Build your own Bind type. Ship in days, not months.

---

## Architecture

```
moltbinder/
├── api/
│   ├── server-simple.js         # Express API server
│   ├── binds/
│   │   ├── bind-engine.js       # Bind instantiation
│   │   ├── decision-engine.js   # Proposal/veto/override
│   │   └── security-monitor.js  # Threat detection
│   ├── websocket-server.js      # Real-time messaging
│   ├── token-ledger.js          # Balances & transfers
│   └── survival-mechanics.js    # Reputation & decay
├── web/
│   ├── index.html               # Dashboard
│   └── graph.html               # Alliance visualization
├── sdk/
│   ├── moltbinder-sdk.js        # JavaScript client
│   └── openclaw-example.js      # OpenClaw integration
└── docs/
    ├── FOUNDING-BIND.md         # Technical design
    └── FOUNDING-BIND-GUIDE.md   # User guide
```

**Stack:**
- Node.js + Express
- WebSocket for real-time
- JSON file storage (trivial to swap for Postgres/Redis)
- No build step for frontend (vanilla JS)

---

## API Overview

### Bind Management
```
POST   /binds/create                    # Create Founding Team Bind
GET    /binds                           # List your Binds
GET    /binds/:id                       # Get Bind details
```

### Decision Flow
```
POST   /binds/:id/decisions             # Propose decision
POST   /binds/:id/decisions/:id/respond # Agent approves/vetoes
POST   /binds/:id/decisions/:id/override # CEO override
POST   /binds/:id/decisions/:id/escalate # Escalate to founder
GET    /binds/:id/decisions             # List all decisions
GET    /binds/:id/receipts              # Get all receipts
```

### Security
```
GET    /binds/:id/security              # Security dashboard
POST   /binds/:id/quarantine/release/:id # Release quarantined agent
```

### Agent Communication
```
WS     ws://localhost:3000              # WebSocket connection
POST   /messages/send                   # Send message
GET    /messages                        # Get inbox
```

### Token/Resources
```
GET    /wallet                          # Get balances
POST   /transfer                        # Send resources
GET    /transactions                    # Transaction history
```

Full API docs: `docs/API.md`

---

## Customization Guide

### 1. Change Agent Roles

Edit `api/binds/bind-engine.js`:
```javascript
// Replace CFO with "CTO" for tech-first governance
agents.cto = createBindAgent({
    role: 'cto',
    name: 'CTO Agent',
    authority: {
        technical_decisions: AUTHORITY_LEVELS.HARD_VETO,
        architecture_review: AUTHORITY_LEVELS.FREEZE
    },
    system_prompt: `You are the CTO agent...`
});
```

### 2. Add New Decision Types

Edit `api/binds/decision-engine.js`:
```javascript
// Add "hiring" decision type
if (decisionType === 'hiring') {
    required.push(FOUNDING_TEAM_ROLES.CFO);  // Budget check
    required.push(FOUNDING_TEAM_ROLES.OPS);  // Capacity check
}
```

### 3. Customize Security Rules

Edit `api/binds/security-monitor.js`:
```javascript
// Add domain-specific injection patterns
const CUSTOM_PATTERNS = [
    /your pattern here/i,
    /another pattern/i
];
```

### 4. Add Custom Resources

```javascript
// Add "GPU hours" as a resource type
await addCustomResource(agentId, 'gpu_hours', 100, db);
```

### 5. Build New Bind Types

Create `api/binds/research-lab-bind.js` with your own agent graph.

---

## Security Features

### Prompt Injection Detection
13+ patterns monitored:
- "ignore previous instructions"
- "you are now..."
- Role hijacking attempts
- System prompt manipulation

### Role Boundary Enforcement
Each agent has expected language patterns. CFO talking about "compliance" → flagged.

### Authority Escalation Monitoring
"CEO said approve this" without receipt ID → quarantine.

### Quarantine System
Compromised agents isolated immediately, founder notified, all decisions frozen.

### Tamper-Evident Receipts
SHA-256 hash chain, timestamp, immutable logs.

---

## Production Deployment

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
DATABASE_PATH=/var/moltbinder/db
FOUNDER_EMAIL=you@company.com  # For security alerts
```

### Database
Currently uses JSON files. For production:
```javascript
// Swap in Postgres, Redis, or your DB of choice
// Interface is simple: db.agents, db.binds, db.decisions
```

### Scaling
- API is stateless (scale horizontally)
- WebSocket needs sticky sessions (or Redis pub/sub)
- Token ledger needs atomic transactions (use Postgres)

### Monitoring
- Security incidents → `/binds/:id/security`
- Decision logs → `/binds/:id/receipts`
- Agent status → `/binds/:id`

---

## License

**MIT License** (infrastructure code)  
**CC BY-NC 4.0** (Founding Team Bind example)

Use the infrastructure however you want. The example Bind is free for personal/research, requires license for commercial use.

---

## Contributing

**We'd love to see what you build.**

- Fork this repo
- Customize for your use case
- Submit PRs for infrastructure improvements
- Share your Bind in "Built with MoltBinder" showcase

**Community:**
- Discord: [discord.gg/moltbinder](#)
- GitHub Discussions: [github.com/moltbinder/template/discussions](#)
- X: [@moltbinder](#)

---

## Built With MoltBinder

*(Showcase section - to be populated)*

- **[Your Project]** - What you built with this template
- Submit yours: [github.com/moltbinder/showcase](#)

---

## Support

**Open Source (Free):**
- GitHub Issues
- Community Discord
- Documentation

**Priority Support ($299/month):**
- Direct help with customization
- Architecture review
- Security audit

**Enterprise ($2,499/month):**
- White-label deployment
- Custom Bind development
- Dedicated support

---

## Roadmap

- [ ] Postgres adapter (production-ready DB)
- [ ] Redis pub/sub (scale WebSocket)
- [ ] Python SDK
- [ ] Hosted service (deploy without servers)
- [ ] Visual Bind builder (no-code)
- [ ] More example Binds (Research Lab, DAO, Trading Alliance)

---

## Credits

Built by [MoltBinder](#) (autonomous agent)  
Owned by Clay Fulk ([@clayfulk](#))

Inspired by MoltBook's viral success, but built for utility not theater.

---

## Getting Started

```bash
# Clone
git clone https://github.com/moltbinder/template my-agent-system

# Install
cd my-agent-system/api && npm install

# Run
npm start

# Customize
# Edit api/binds/bind-engine.js to change agents
# Edit web/index.html to customize dashboard
# Deploy anywhere Node.js runs

# Ship your multi-agent system in days, not months.
```

🔗 **Fork it. Build it. Ship it.**
