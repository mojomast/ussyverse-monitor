# Ussyverse Monitor

A beautiful, real-time desktop monitoring application for the Ussyverse Hub running at port 3002. Monitor your AI agent sessions live with a visually appealing interface.

![Ussyverse Monitor](https://img.shields.io/badge/version-1.0.0-blue)

## Features

### Real-Time Monitoring
- Live updates via Server-Sent Events (SSE)
- Automatic session detection and refresh
- Connection status indicator
- Auto-refresh session list every 10 seconds

### Visual Customization
- **Font Size Control**: Adjust from 10px to 20px
- **Smooth Animations**: Slide-in effects for new messages
- **Color-Coded Messages**: Different colors for user, assistant, and tool messages
- **Dark Theme**: Beautiful dark mode optimized for long monitoring sessions

### Content Management
- **Configurable Line Truncation**: Set max lines per message (5-100 lines)
- **Expand/Collapse Buttons**: Click to expand truncated messages
- **Auto-Scroll**: Toggle automatic scrolling to latest message
- **Markdown Support**: Basic markdown rendering for code blocks, links, bold, italic

### Advanced Features
- **HTML Export**: Export entire sessions to beautiful standalone HTML files
- **Emergency Stop Button**: Instantly stop the bot if something goes wrong
- **User Input Box**: Send override messages directly to the active session
- **Always on Top**: Pin window above all others
- **System Tray**: Minimize to tray, quick show/hide

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Ussyverse Hub running on `http://localhost:3002`
- **Ubuntu Desktop with GUI** (X display required for Electron)
  - OR X11 forwarding via SSH (`ssh -X`)
  - OR xvfb for headless environments

### Steps

1. Navigate to the monitor directory:
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:

**Option A: On Desktop (Recommended)**
```bash
npm start
```

**Option B: Via SSH with X11 Forwarding**
```bash
ssh -X user@host
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
npm start
```

**Option C: Headless Mode (via SSH without display)**
```bash
# Install xvfb first: sudo apt-get install xvfb
./start-headless.sh
# Note: Window won't be visible, but app runs
```

### Development Mode

To run with developer tools enabled:
```bash
npm run dev
```

## Usage

### Starting the Monitor

1. Ensure the Ussyverse Hub is running on port 3002
2. Launch the monitor app using `npm start`
3. The app will automatically connect to the hub

### Monitoring Sessions

1. **Select a Session**: Click on any session in the left sidebar
2. **Watch Live Updates**: Messages appear in real-time as they're added
3. **Adjust View**: Use controls at the top to customize display
   - Font size slider
   - Max lines per message
   - Auto-scroll toggle
   - Always on top toggle

### Sending Override Messages

**NEW FEATURE - Fully Functional!**

Send high-priority messages directly to the agent, overriding whatever task it's working on:

1. Type your message in the input box at the bottom
2. Press **Ctrl+Enter** or click the **Send** button
3. Your message will be queued as a high-priority override
4. The agent will pick it up on its next heartbeat (usually within seconds)
5. The agent will process your message immediately, stopping current tasks if needed

**How it works**:
- Your message is written to `.agents/override-messages/` as a JSON file
- Agent checks this directory on every heartbeat
- Messages are processed with highest priority
- After processing, message files are moved to `processed/` folder

See `OVERRIDE_MESSAGES.md` in the workspace for full documentation.

### Emergency Stop

If you notice something wrong and need to stop the bot immediately:

1. Click the red **STOP** button in the top-right
2. Confirm the action
3. All agent processes will be terminated

### Exporting Sessions

To save a session as a beautiful HTML file:

1. Select the session you want to export
2. Click the **Export HTML** button
3. The file will be downloaded to your Downloads folder
4. Open in any browser for offline viewing

## Keyboard Shortcuts

- **Ctrl+Enter** (in input box): Send message
- **System Tray Click**: Show/Hide window

## Configuration

### Hub URL

If your hub runs on a different port, edit `renderer.js`:

```javascript
const HUB_URL = 'http://localhost:YOUR_PORT';
```

### Default Settings

Edit these variables in `renderer.js`:

```javascript
let autoScroll = true;    // Enable/disable auto-scroll by default
let maxLines = 20;        // Default max lines per message
let fontSize = 14;        // Default font size
```

## Troubleshooting

### Sandbox / Chrome Error

**Symptom**: "chrome-sandbox not configured correctly" or similar sandbox error

**Solution**: Already fixed! The app now runs with `--no-sandbox` flag, which is safe for this local desktop application. If you still see issues, see `SANDBOX_FIX.md`.

### Display / X Server Error

**Symptom**: "Missing X server or $DISPLAY" error

**Solution**:
1. **Best**: Run directly on the Ubuntu desktop (not via SSH)
2. **Good**: Use SSH with X11 forwarding: `ssh -X user@host`
3. **Alternative**: Use headless mode: `./start-headless.sh`

To check if you have a display:
```bash
echo $DISPLAY
# Should show :0 or :1, not empty
```

### Connection Issues

**Symptom**: Status shows "Disconnected" or "Connecting..."

**Solution**:
1. Verify hub is running: `curl http://localhost:3002/api/health`
2. Check hub logs: `tail -50 ../usyverse-hub/hub.log`
3. Restart the hub if needed
4. Restart the monitor app

### No Sessions Showing

**Symptom**: Sidebar shows "No active sessions"

**Solution**:
1. Check if session files exist: `ls ~/.openclaw/agents/main/sessions/*.jsonl`
2. Verify hub can access sessions: `curl http://localhost:3002/api/sessions`
3. Check file permissions in sessions directory

### Messages Not Updating

**Symptom**: Session loaded but not updating in real-time

**Solution**:
1. Check SSE connection (status indicator should be green)
2. Open dev tools (`npm run dev`) and check console for errors
3. Reload the app (Ctrl+R or restart)

### Emergency Stop Not Working

**Symptom**: Stop button clicked but bot still running

**Solution**:
1. Check if hub API endpoint is accessible: `curl -X POST http://localhost:3002/api/control/stop`
2. Manually stop processes: `pkill -f "node.*server.js"`
3. Check hub implementation of `/api/control/stop` endpoint

## Architecture

### Electron App Structure

```
ussyverse-monitor/
├── package.json       # Dependencies and scripts
├── main.js           # Electron main process
├── preload.js        # IPC bridge (security)
├── index.html        # UI layout and styles
├── renderer.js       # Frontend logic
└── README.md         # This file
```

### Communication Flow

```
Monitor App (Renderer)
    ↓ SSE Events
Hub Server (Port 3002)
    ↓ File System Watch
Session Files (*.jsonl)
    ↓ Updates from
OpenClaw Agent
```

### Security

- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **IPC Bridge**: Preload script exposes only necessary APIs
- **No eval()**: All code statically defined

## API Integration

The monitor integrates with these hub endpoints:

- `GET /api/events` - SSE event stream
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get session content
- `POST /api/control/stop` - Emergency stop
- `POST /api/agent/send-message` - Send override message

## Contributing

This app is part of the Ussyverse project. To contribute:

1. Make changes in your local copy
2. Test thoroughly with live hub connection
3. Commit with descriptive message
4. Update this README if needed

## Future Enhancements

Potential features for future versions:

- [ ] Multi-session view (split screen)
- [ ] Search within session
- [ ] Filter by message type (user/assistant/tool)
- [ ] Token usage statistics per session
- [ ] Session comparison view
- [ ] Desktop notifications for important events
- [ ] Session recording/replay
- [ ] Custom color themes
- [ ] Keyboard shortcuts for common actions

## Credits

Created by Clawussy for the Ussyverse ecosystem.

## License

MIT
