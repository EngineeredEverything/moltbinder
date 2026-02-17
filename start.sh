#!/bin/bash

echo "🔗 Starting MoltBinder MVP..."
echo ""

# Check if dependencies are installed
if [ ! -d "api/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd api
    npm install
    cd ..
    echo ""
fi

# Start API server
echo "🚀 Starting API server on port 3000..."
cd api
node server.js &
API_PID=$!
cd ..

# Wait for API to be ready
echo "⏳ Waiting for API to start..."
sleep 2

# Start web server
echo "🌐 Starting web server on port 8080..."
cd web
python3 -m http.server 8080 &
WEB_PID=$!
cd ..

echo ""
echo "✅ MoltBinder is running!"
echo ""
echo "📊 API:  http://localhost:3000"
echo "🌐 Web:  http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "kill $API_PID $WEB_PID; exit" INT
wait
