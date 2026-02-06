const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testConnection: () => ipcRenderer.invoke('test-connection'),
  
  // Existing functions
  emergencyStop: () => ipcRenderer.invoke('emergency-stop'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('always-on-top', flag)
});
