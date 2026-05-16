const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), 'Documents', 'Provstudio-Lokalt');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('load-data', () => {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
});

ipcMain.handle('save-data', (_event, data) => {
  ensureDirs();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
});

ipcMain.handle('save-image', (_event, id, b64) => {
  ensureDirs();
  fs.writeFileSync(path.join(IMAGES_DIR, `${id}.b64`), b64, 'utf-8');
});

ipcMain.handle('read-image', (_event, id) => {
  const file = path.join(IMAGES_DIR, `${id}.b64`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf-8');
});

ipcMain.handle('open-print-window', (_event, docId) => {
  const win = new BrowserWindow({
    width: 900,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const url = `file://${path.join(__dirname, 'index.html')}?print=${docId}`;
  win.loadURL(url);
  win.webContents.once('did-finish-load', () => {
    win.webContents.executeJavaScript('window.print()');
  });
});

ipcMain.handle('export-file', async (_event, data) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportera dokument',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    defaultPath: 'provstudio-export.json',
  });
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('import-file', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importera dokument',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (filePaths && filePaths[0]) {
    return JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  }
  return null;
});

ipcMain.handle('fetch-update', async (_event, url) => {
  const response = await net.fetch(url);
  return response.text();
});

ipcMain.handle('save-index-html', (_event, html) => {
  const dest = path.join(app.getAppPath(), 'index.html');
  fs.writeFileSync(dest, html, 'utf-8');
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('get-app-version', () => app.getVersion());
