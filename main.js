const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable GPU acceleration and sandbox for Linux compatibility
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');
app.commandLine.appendSwitch('--disable-gpu');

let mainWindow;
let tray;
let config = {
  hubIP: 'localhost',
  hubPort: 3002
};

// Load config from userData
function loadConfig() {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
      console.log('Config loaded:', config);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save config to userData
function saveConfig(newConfig) {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    config = { ...config, ...newConfig };
    if (!fs.existsSync(app.getPath('userData'))) {
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Config saved:', config);
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Dev tools for debugging
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // Create a simple 16x16 icon for the tray
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE3SURBVDiNpZKxSgNBEIa/vd3bJBcQJIUQLFKksRFsbOxsfQKfwMbKRxBsbH0EGy0srK0EwUYQRFJYpBBIYnK5292xSHK5XAzYgYVl5///Zv4ZkZmF/wVJTYDrgBvgCWgDV8AhsA/cAvfAEXAGbAKbwAawDqwBq8AKsAwsAUvAIrAA1IE5YBaoATPANDAFTAITwDgwBowCNeAz8JHJP0VEZmYhhBdgH7gEngEvQBt4Bd6AD+AD+AR6wBfwDfSBb+AH+AV+gT/gD/gH/gMDYAgMgRHwDfwAA2AIDIEx8A38An1gCIyBMfAL/AJ9YAiMgTHwC/wCfWAIjIEx8Av8An1gCIyBMfAL/AJ9YAiMgTHwC/wCfWAIjIEx8Av8An1gCIyBMfAL/AJ9YAiMgTHwC/wCfWAIjIEx8Av8An1gCIyBMfAL/AJfMfmniMg/6BdQN1eJqgAAAABJRU5ErkJggg==');
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Monitor', click: () => { mainWindow.show(); } },
    { label: 'Hide Monitor', click: () => { mainWindow.hide(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { 
      app.isQuitting = true;
      app.quit(); 
    }}
  ]);
  
  tray.setToolTip('Ussyverse Monitor');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// IPC handlers

// Config management
ipcMain.handle('get-config', async () => {
  return config;
});

ipcMain.handle('save-config', async (event, newConfig) => {
  return saveConfig(newConfig);
});

ipcMain.handle('test-connection', async () => {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.request({
        hostname: config.hubIP,
        port: config.hubPort,
        path: '/api/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        resolve({ success: res.statusCode === 200, connected: true });
      });
      req.on('error', () => resolve({ success: false, connected: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, connected: false, error: 'timeout' });
      });
      req.end();
    });
  } catch (error) {
    return { success: false, connected: false, error: error.message };
  }
});

ipcMain.handle('emergency-stop', async () => {
  try {
    const http = require('http');
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: config.hubIP,
        port: config.hubPort,
        path: '/api/control/stop',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ success: true, data }));
      });
      req.on('error', reject);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-message', async (event, message) => {
  try {
    const http = require('http');
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ message });
      const req = http.request({
        hostname: config.hubIP,
        port: config.hubPort,
        path: '/api/agent/send-message',
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ success: res.statusCode === 200, data }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('always-on-top', async (event, flag) => {
  mainWindow.setAlwaysOnTop(flag);
  return { success: true };
});
