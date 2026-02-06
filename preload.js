const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  emergencyStop: () => ipcRenderer.invoke('emergency-stop'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('always-on-top', flag)
});
