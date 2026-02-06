# Quick Start Guide

## Running the Monitor

### Option 1: Using the launcher script (Recommended)
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
./start.sh
```

The launcher will:
1. Check if the hub is running
2. Install dependencies if needed
3. Launch the Electron app

### Option 2: Manual start
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
npm start
```

### Option 3: Development mode (with DevTools)
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
npm run dev
```

---

## First Time Setup

If this is your first time running the monitor:

1. **Ensure hub is running**:
```bash
cd /home/moltussy/.openclaw/workspace/usyverse-hub
node server.js &
```

2. **Navigate to monitor directory**:
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
```

3. **Install dependencies** (only needed once):
```bash
npm install
```

4. **Launch the app**:
```bash
npm start
```

---

## Features Overview

### Main Window

When the app opens, you'll see:

**Left Sidebar**: List of all active sessions
- Click any session to view it
- Shows size and last modified time
- Active session is highlighted

**Top Controls**:
- Font size slider (10-20px)
- Max lines per message (5-100)
- Auto-scroll toggle
- Always on top toggle

**Main Area**: Chat messages
- Color-coded by role (user/assistant/tool)
- Timestamps for each message
- Expand/collapse buttons for long messages
- Smooth animations

**Bottom Input**: Message box (feature coming soon)

**Top Right**:
- Export HTML button
- Emergency STOP button (stops the bot)

---

## Quick Tips

### Monitoring Live Sessions

1. The app connects automatically to port 3002
2. Session list updates every 10 seconds
3. Current session refreshes in real-time via SSE
4. Green dot = connected, gray = disconnected

### Adjusting Display

- **Too small?** Increase font size with the slider
- **Too much text?** Lower max lines to truncate long messages
- **Want to scroll manually?** Toggle off auto-scroll
- **Need it always visible?** Enable always on top

### Exporting Sessions

1. Select the session you want to export
2. Click "Export HTML"
3. File downloads to your Downloads folder
4. Open in any browser for beautiful offline viewing

### Emergency Stop

If something goes wrong:

1. Click the red STOP button
2. Confirm the action
3. All agent processes will be terminated
4. Use with caution!

---

## Troubleshooting

### App won't start
```bash
# Check if hub is running
curl http://localhost:3002/api/health

# If not, start it
cd ../usyverse-hub && node server.js &
```

### Connection issues
- Check the status indicator (top left)
- Green = connected, gray = disconnected
- App auto-reconnects every 5 seconds

### No sessions showing
```bash
# Check if sessions exist
ls ~/.openclaw/agents/main/sessions/*.jsonl

# Restart the app
```

### Messages not updating
- Check connection status (should be green)
- Try refreshing: close and reopen the session
- Check hub logs for errors

---

## System Requirements

- **OS**: Ubuntu 20.04+ (or any Linux with Electron support)
- **Node.js**: 18.0.0 or higher
- **RAM**: 200MB (typical usage)
- **Disk**: 100MB for app + dependencies

---

## Performance

The app is optimized for:
- Real-time updates with minimal latency
- Smooth animations (60fps)
- Low memory footprint
- Efficient SSE connection

Large sessions (1000+ messages) are handled with:
- Progressive loading
- Smart truncation
- On-demand expansion

---

## Keyboard Shortcuts

Currently available:
- **Ctrl+Enter** (in input box): Send message
- **Ctrl+R**: Reload app
- **Ctrl+Q**: Quit app

System tray:
- **Click**: Show/hide window
- **Right-click**: Context menu

---

## Next Steps

After getting comfortable with the basics:

1. Check out `FUTURE.md` for upcoming features
2. Customize settings to your preference
3. Try exporting a session to HTML
4. Set up always-on-top for continuous monitoring

---

## Support

If you encounter issues:

1. Check the console (run with `npm run dev`)
2. Review `README.md` troubleshooting section
3. Check hub logs: `tail -f ../usyverse-hub/hub.log`
4. Ensure all endpoints are accessible

---

Enjoy monitoring your Ussyverse!
