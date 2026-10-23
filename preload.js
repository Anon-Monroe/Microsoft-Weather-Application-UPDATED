const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('term', {
  shells: () => ipcRenderer.invoke('term:shells'),
  start: id => ipcRenderer.invoke('term:start', id),
  write: text => ipcRenderer.send('term:write', text),
  onData: cb => ipcRenderer.on('term:data', (e, text) => cb(text)),
  azure: () => ipcRenderer.send('open:azure')
});
