#!/bin/bash

# Ussyverse Monitor Launcher
# This script checks if the hub is running and launches the monitor

echo "🚀 Starting Ussyverse Monitor..."

# Check if hub is running
echo "Checking hub connection..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ Hub is running at port 3002"
else
    echo "❌ Hub is not running!"
    echo "Please start the hub first:"
    echo "  cd ../usyverse-hub && node server.js"
    exit 1
fi

# Check if in correct directory
if [ ! -f "package.json" ]; then
    cd "$(dirname "$0")"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Launch the app
echo "🎯 Launching monitor..."
npm start
