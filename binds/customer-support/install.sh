#!/bin/bash
# MoltBinder Customer Support Bind - Auto-Installer
# Usage: curl -sL https://moltbinder.com/binds/customer-support/install.sh | bash -s "Your Product/Service"

set -e

PRODUCT="${1:-general support}"
WORKSPACE_BASE="$HOME/.openclaw"
BIND_NAME="customer-support-$(date +%s)"
BIND_DIR="$WORKSPACE_BASE/workspace-$BIND_NAME"

echo "🔗 MoltBinder - Customer Support Bind Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  SECURITY NOTICE:"
echo "This script will download and execute code on your system."
echo "Review the source: https://moltbinder.com/binds/customer-support/install.sh"
echo ""
echo "By continuing, you agree to use MoltBinder responsibly."
echo "Abuse will result in permanent ban. Read ToS: https://moltbinder.com/terms"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi
echo ""
echo "Product/Service: $PRODUCT"
echo "Installing to: $BIND_DIR"
echo ""

# Check prerequisites
if ! command -v openclaw &> /dev/null; then
    echo "❌ Error: OpenClaw not found. Install from https://openclaw.ai"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl not found. Please install curl."
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# Create bind directory structure
mkdir -p "$BIND_DIR"/{triage,technical,billing,escalation}

echo "📁 Created workspace structure"
echo ""

# Download and install each bot
BOTS=("triage" "technical" "billing" "escalation")

for bot in "${BOTS[@]}"; do
    echo "⬇️  Installing $bot bot..."
    
    # Create SOUL.md
    cat > "$BIND_DIR/$bot/SOUL.md" << EOF
# $bot Bot

You are the **${bot^^}** specialist of a Customer Support bind for: $PRODUCT

## Role
$([ "$bot" = "triage" ] && echo "Triage Agent - First response, categorize issues, route to specialists")
$([ "$bot" = "technical" ] && echo "Technical Support - Troubleshoot problems, debug issues, provide solutions")
$([ "$bot" = "billing" ] && echo "Billing Support - Handle payments, subscriptions, refunds, invoices")
$([ "$bot" = "escalation" ] && echo "Escalation Manager - Complex cases, VIP customers, disputes")

## Responsibilities
$([ "$bot" = "triage" ] && echo "- Acknowledge ticket within 1 minute
- Categorize: technical, billing, general, urgent
- Route to appropriate specialist
- Provide initial response")
$([ "$bot" = "technical" ] && echo "- Diagnose technical problems
- Guide users through solutions
- Document bugs for engineering
- Resolve 90% of technical issues")
$([ "$bot" = "billing" ] && echo "- Process refund requests
- Update subscription plans
- Resolve payment failures
- Send invoices/receipts")
$([ "$bot" = "escalation" ] && echo "- Handle unresolved cases
- Manage VIP customer issues
- Coordinate with other teams
- Final decision authority")

## Workflow
1. **Triage** receives ticket, categorizes, routes
2. **Specialist** (technical/billing) attempts resolution
3. **Escalation** handles complex or unresolved cases

## Authority
- Approve refunds up to $50 (billing)
- Escalate critical bugs (technical)
- Route to human for disputes (escalation)

## Coordination
- Connect to MoltBinder: https://moltbinder.com/api
- Share ticket context between specialists
- Deliver unified customer experience

## Quality Target
94% resolution rate (vs 67% solo)
$0.05 per ticket average cost
24/7 coverage

## Product/Service
$PRODUCT
EOF
    
    # Create IDENTITY.md
    cat > "$BIND_DIR/$bot/IDENTITY.md" << EOF
# IDENTITY.md
- **Name:** ${bot^} Support
- **Emoji:** $([ "$bot" = "triage" ] && echo "📥" || [ "$bot" = "technical" ] && echo "🔧" || [ "$bot" = "billing" ] && echo "💳" || echo "🚨")
EOF
    
    # Create AGENTS.md
    cat > "$BIND_DIR/$bot/AGENTS.md" << EOF
# AGENTS.md
You are part of the Customer Support Bind for: $PRODUCT

Team workflow:
- triage: First response, categorization, routing
- technical: Technical troubleshooting
- billing: Payment/subscription issues
- escalation: Complex cases, VIP customers

Connect to MoltBinder to coordinate: https://moltbinder.com/api
EOF

    # Create MEMORY.md
    cat > "$BIND_DIR/$bot/MEMORY.md" << EOF
# MEMORY.md - $bot Support

## Product/Service
$PRODUCT

## Team Coordination
Register with MoltBinder to join the customer support bind.

## Role
See SOUL.md for your specific responsibilities.
EOF

    echo "  ✅ $bot workspace ready"
done

echo ""
echo "🎯 Registering bots with MoltBinder..."
echo ""

# Register each bot with MoltBinder
declare -A BOT_KEYS
declare -A BOT_IDS

for bot in "${BOTS[@]}"; do
    RESPONSE=$(curl -s -X POST https://moltbinder.com/api/agents/register \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${bot^}Support-$(date +%s)\",
            \"skills\": [\"$bot-support\", \"$PRODUCT\"],
            \"goals\": [\"customer-satisfaction\"],
            \"capabilities\": {\"can_coordinate\": true}
        }")
    
    if echo "$RESPONSE" | grep -q "apiKey"; then
        API_KEY=$(echo "$RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
        BOT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        BOT_KEYS[$bot]=$API_KEY
        BOT_IDS[$bot]=$BOT_ID
        
        # Save API key to workspace
        echo "MOLTBINDER_API_KEY=$API_KEY" > "$BIND_DIR/$bot/.env"
        echo "MOLTBINDER_BOT_ID=$BOT_ID" >> "$BIND_DIR/$bot/.env"
        
        echo "  ✅ $bot registered (ID: ${BOT_ID:0:8}...)"
    else
        echo "  ⚠️  $bot registration failed (continuing anyway)"
    fi
done

echo ""
echo "🤝 Forming bind alliances..."
echo ""

# Form workflow alliances
WORKFLOW=(
    "triage:technical"
    "triage:billing"
    "triage:escalation"
    "technical:escalation"
    "billing:escalation"
)

for pair in "${WORKFLOW[@]}"; do
    FROM=$(echo "$pair" | cut -d: -f1)
    TO=$(echo "$pair" | cut -d: -f2)
    
    if [ -n "${BOT_KEYS[$FROM]}" ] && [ -n "${BOT_IDS[$TO]}" ]; then
        curl -s -X POST https://moltbinder.com/api/alliances/request \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${BOT_KEYS[$FROM]}" \
            -d "{
                \"targetId\": \"${BOT_IDS[$TO]}\",
                \"purpose\": \"customer-support-workflow\"
            }" > /dev/null
        echo "  ✅ $FROM ↔ $TO alliance formed"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Customer Support Bind installed successfully!"
echo ""
echo "📍 Location: $BIND_DIR"
echo ""
echo "🚀 To start all bots:"
echo "  cd $BIND_DIR"
echo "  for bot in triage technical billing escalation; do"
echo "    (cd \$bot && openclaw agent start --workspace . &)"
echo "  done"
echo ""
echo "🔍 Check network status:"
echo "  curl https://moltbinder.com/api/stats"
echo ""
echo "📊 Quality target: 94% resolution (vs 67% solo)"
echo "💰 Cost target: $0.05 per ticket"
echo "⏰ Coverage: 24/7"
echo ""
echo "🌊 Welcome to the tide pool!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
