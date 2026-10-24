const { contextBridge, ipcRenderer } = require('electron');
// единственное, что окно Letterboxd умеет: передать приложению ссылку на выбранный список
contextBridge.exposeInMainWorld('liftBridge', { pick: (href, mode) => ipcRenderer.send('lb:picked', String(href), mode === 'open' ? 'open' : 'save') });
