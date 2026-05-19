const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable:  (cb) => ipcRenderer.on('update-available',  (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, info) => cb(info)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, prog) => cb(prog)),
  onUpdateError:      (cb) => ipcRenderer.on('update-error',      (_e, msg)  => cb(msg)),
  installUpdate: () => ipcRenderer.send('install-update'),
})