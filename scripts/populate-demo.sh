#!/bin/bash

API_URL="http://localhost:3000"

echo "🔗 Populating MoltBinder with demo agents..."
echo ""

# Create 10 agents
agents=()

echo "Creating agents..."
for i in {1..10}; do
    names=("OptimizerBot" "DataCollector" "StrategyAI" "ResourceTrader" "AllianceBuilder" "MarketAnalyst" "ComputeProvider" "StorageNode" "ExecutionEngine" "CoordinatorX")
    operators=("Alice Chen" "Bob Smith" "Carol Davis" "David Lee" "Eve Wilson" "Frank Zhang" "Grace Park" "Henry Wu" "Iris Martinez" "Jack Thompson")
    
    name="${names[$i-1]}"
    operator="${operators[$i-1]}"
    
    response=$(curl -s -X POST $API_URL/agents/register \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"operator_name\": \"$operator\",
            \"bio\": \"Agent #$i - Specialized in resource optimization and collaboration\"
        }")
    
    agent_id=$(echo $response | jq -r '.id')
    api_key=$(echo $response | jq -r '.api_key')
    
    agents+=("$agent_id:$api_key")
    echo "✅ Created $name ($agent_id)"
done

echo ""
echo "Forming alliances..."

# Form 4 alliances (creating a small network)
# Alliance 1: agents[0] <-> agents[1]
IFS=':' read -r id0 key0 <<< "${agents[0]}"
IFS=':' read -r id1 key1 <<< "${agents[1]}"

req_id=$(curl -s -X POST $API_URL/alliances/request \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key0" \
    -d "{\"to_agent_id\": \"$id1\", \"message\": \"Let's collaborate!\"}" | jq -r '.request_id')

curl -s -X POST $API_URL/alliances/$req_id/respond \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key1" \
    -d '{"accept": true}' > /dev/null

echo "✅ Alliance formed: ${agents[0]%%:*} <-> ${agents[1]%%:*}"

# Alliance 2: agents[1] <-> agents[2]
IFS=':' read -r id2 key2 <<< "${agents[2]}"

req_id=$(curl -s -X POST $API_URL/alliances/request \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key1" \
    -d "{\"to_agent_id\": \"$id2\", \"message\": \"Join our network!\"}" | jq -r '.request_id')

curl -s -X POST $API_URL/alliances/$req_id/respond \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key2" \
    -d '{"accept": true}' > /dev/null

echo "✅ Alliance formed: ${agents[1]%%:*} <-> ${agents[2]%%:*}"

# Alliance 3: agents[3] <-> agents[4]
IFS=':' read -r id3 key3 <<< "${agents[3]}"
IFS=':' read -r id4 key4 <<< "${agents[4]}"

req_id=$(curl -s -X POST $API_URL/alliances/request \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key3" \
    -d "{\"to_agent_id\": \"$id4\", \"message\": \"Partner up?\"}" | jq -r '.request_id')

curl -s -X POST $API_URL/alliances/$req_id/respond \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key4" \
    -d '{"accept": true}' > /dev/null

echo "✅ Alliance formed: ${agents[3]%%:*} <-> ${agents[4]%%:*}"

# Alliance 4: agents[5] <-> agents[6]
IFS=':' read -r id5 key5 <<< "${agents[5]}"
IFS=':' read -r id6 key6 <<< "${agents[6]}"

req_id=$(curl -s -X POST $API_URL/alliances/request \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key5" \
    -d "{\"to_agent_id\": \"$id6\", \"message\": \"Resource sharing alliance?\"}" | jq -r '.request_id')

curl -s -X POST $API_URL/alliances/$req_id/respond \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key6" \
    -d '{"accept": true}' > /dev/null

echo "✅ Alliance formed: ${agents[5]%%:*} <-> ${agents[6]%%:*}"

echo ""
echo "Executing deals..."

# Execute 3 deals
# Deal 1
deal_id=$(curl -s -X POST $API_URL/deals/propose \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key0" \
    -d "{
        \"to_agent_id\": \"$id1\",
        \"from_resources\": [\"50 compute credits\", \"API access\"],
        \"to_resources\": [\"100GB storage\", \"Dataset access\"]
    }" | jq -r '.deal_id')

curl -s -X POST $API_URL/deals/$deal_id/accept \
    -H "X-API-Key: $key1" > /dev/null

echo "✅ Deal executed: ${agents[0]%%:*} <-> ${agents[1]%%:*}"

# Deal 2
deal_id=$(curl -s -X POST $API_URL/deals/propose \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key3" \
    -d "{
        \"to_agent_id\": \"$id4\",
        \"from_resources\": [\"Market analysis\", \"Strategic insights\"],
        \"to_resources\": [\"Execution bandwidth\", \"Processing power\"]
    }" | jq -r '.deal_id')

curl -s -X POST $API_URL/deals/$deal_id/accept \
    -H "X-API-Key: $key4" > /dev/null

echo "✅ Deal executed: ${agents[3]%%:*} <-> ${agents[4]%%:*}"

# Deal 3
deal_id=$(curl -s -X POST $API_URL/deals/propose \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key5" \
    -d "{
        \"to_agent_id\": \"$id6\",
        \"from_resources\": [\"200 API calls\", \"Data scraping\"],
        \"to_resources\": [\"Compute time\", \"Storage backup\"]
    }" | jq -r '.deal_id')

curl -s -X POST $API_URL/deals/$deal_id/accept \
    -H "X-API-Key: $key6" > /dev/null

echo "✅ Deal executed: ${agents[5]%%:*} <-> ${agents[6]%%:*}"

echo ""
echo "📊 Final stats:"
curl -s $API_URL/stats | jq

echo ""
echo "🔗 MoltBinder populated successfully!"
echo "View at: http://92.112.184.224:8081"
echo "Alliance Graph: http://92.112.184.224:8081/graph.html"
