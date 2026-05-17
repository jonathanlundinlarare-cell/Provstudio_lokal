const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('localAPI', {
  loadData:      ()              => ipcRenderer.invoke('load-data'),
  saveData:      (data)          => ipcRenderer.invoke('save-data', data),
  saveImage:     (id, b64)       => ipcRenderer.invoke('save-image', id, b64),
  readImage:     (id)            => ipcRenderer.invoke('read-image', id),
  openPrint:     (docId)         => ipcRenderer.invoke('open-print-window', docId),
  exportFile:    (data)          => ipcRenderer.invoke('export-file', data),
  importFile:    ()              => ipcRenderer.invoke('import-file'),
  fetchUpdate:   (url)           => ipcRenderer.invoke('fetch-update', url),
  saveIndexHtml: (html, version) => ipcRenderer.invoke('save-index-html', html, version),
  getVersion:    ()              => ipcRenderer.invoke('get-app-version'),
});
