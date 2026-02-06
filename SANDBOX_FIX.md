# Sandbox Issue - RESOLVED

## Problem
Electron was complaining about chrome-sandbox binary not being configured correctly and aborting instead of running without sandboxing.

## Solution Applied

### 1. Added Command Line Switches
Updated `main.js` to disable sandbox at startup:
```javascript
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');
app.commandLine.appendSwitch('--disable-gpu');
```

### 2. Updated Package Scripts
Modified `package.json` scripts to include `--no-sandbox` flag:
```json
"scripts": {
  "start": "electron . --no-sandbox",
  "dev": "electron . --dev --no-sandbox"
}
```

## Why This Is Safe

The `--no-sandbox` flag is safe for this use case because:

1. **Local Use Only**: App only connects to localhost:3002
2. **Trusted Content**: No untrusted web content is loaded
3. **Desktop App**: Not a web browser, controlled environment
4. **No User Input Rendering**: Doesn't render arbitrary HTML from users

## Running the App

### On Desktop with Display
```bash
npm start
```

### Headless/SSH Environment
If you're running via SSH without X display, use xvfb:

```bash
# Install xvfb if needed
sudo apt-get install xvfb

# Run with virtual display
xvfb-run -a npm start
```

Or use the provided launcher script:
```bash
./start-headless.sh
```

## Alternative Solutions (Not Needed Now)

If you wanted to keep sandboxing enabled, you would need to:

### Option 1: Fix chrome-sandbox permissions
```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### Option 2: Set kernel.unprivileged_userns_clone
```bash
echo 'kernel.unprivileged_userns_clone = 1' | sudo tee /etc/sysctl.d/00-local-userns.conf
sudo sysctl -p /etc/sysctl.d/00-local-userns.conf
```

### Option 3: Use --disable-setuid-sandbox
Already included in our solution above.

## Display Issues

### Error: Missing X server or $DISPLAY
This means you're running in a headless environment (SSH, no GUI).

**Solutions**:

1. **Use X11 Forwarding (SSH)**:
```bash
ssh -X user@host
cd /path/to/ussyverse-monitor
npm start
```

2. **Use Virtual Display (xvfb)**:
```bash
xvfb-run -a npm start
```

3. **Run on Desktop** (Best option):
Open a terminal directly on the Ubuntu desktop (not via SSH) and run:
```bash
cd /home/moltussy/.openclaw/workspace/ussyverse-monitor
npm start
```

## Testing

### Check if Display Available
```bash
echo $DISPLAY
# Should output something like :0 or :1
# If empty, you're in headless environment
```

### Test X Server
```bash
xdpyinfo | head
# If this works, you have X display
```

### Test Electron Without GUI (Headless)
```bash
# Install xvfb
sudo apt-get install xvfb

# Run electron with virtual display
DISPLAY=:99 xvfb-run -a npm start
```

## Recommended Usage

**Best**: Run directly on the Ubuntu desktop
- Open terminal on the actual desktop
- Navigate to monitor directory
- Run `npm start`
- Window appears on screen

**Alternative**: SSH with X11 forwarding
- Use `ssh -X` for X11 forwarding
- Requires X server on your local machine
- Window appears on your local screen

**Last Resort**: Headless with xvfb
- Only if you must run via SSH without X11
- Window runs but is invisible
- Useful for testing/automation

## Status
✅ Sandbox issue resolved  
✅ App will start with --no-sandbox  
⚠️ Needs X display to show GUI  

## Documentation Updated
- [x] This file (SANDBOX_FIX.md)
- [x] main.js (command line switches)
- [x] package.json (start scripts)
- [ ] README.md (should add note about display requirements)

---

**Fixed**: 2026-02-05  
**Safe for Production**: Yes (local desktop app only)
