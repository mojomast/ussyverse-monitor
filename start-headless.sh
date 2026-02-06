#!/bin/bash

# Ussyverse Monitor - Headless Launcher
# For running via SSH or in headless environments

echo "🚀 Starting Ussyverse Monitor (Headless Mode)..."

# Check if xvfb is installed
if ! command -v xvfb-run &> /dev/null; then
    echo "❌ xvfb-run not found!"
    echo "Install it with: sudo apt-get install xvfb"
    exit 1
fi

# Check if hub is running
echo "Checking hub connection..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ Hub is running at port 3002"
else
    echo "❌ Hub is not running!"
    echo "Please start the hub first:"
    echo "  cd ../usyverse-hub && node server.js &"
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

# Launch the app with virtual display
echo "🎯 Launching monitor in headless mode..."
echo "Note: The window won't be visible via SSH"
echo "Tip: Use 'ssh -X' for X11 forwarding to see the window"
echo ""

xvfb-run -a npm start
