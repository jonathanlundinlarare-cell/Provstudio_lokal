const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

/**
 * Resolves which index.html to load. After a self-update we have a fresh HTML
 * in userData/ which we prefer over the bundled one (the latter is read-only
 * when installed via NSIS to Program Files).
 */
function resolveIndexHtmlPath() {
  try {
    const userDataHtml = path.join(app.getPath('userData'), 'index.html');
    if (fs.existsSync(userDataHtml)) {
      return userDataHtml;
    }
  } catch {
    // app may not be ready yet when first called — fall through
  }
  return path.join(__dirname, 'index.html');
}

/**
 * Returns the active version. After a self-update, version.json lives next to
 * index.html in userData/ and overrides app.getVersion() (which still reports
 * the version baked into package.json at install time).
 */
function getActiveVersion() {
  try {
    const verFile = path.join(app.getPath('userData'), 'version.json');
    if (fs.existsSync(verFile)) {
      const parsed = JSON.parse(fs.readFileSync(verFile, 'utf-8'));
      if (parsed && typeof parsed.version === 'string') return parsed.version;
    }
  } catch {
    // fall through to bundled version
  }
  return app.getVersion();
}

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

  mainWindow.loadFile(resolveIndexHtmlPath());
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
  const url = `file://${resolveIndexHtmlPath()}?print=${docId}`;
  win.loadURL(url);
  win.webContents.once('did-finish-load', () => {
    win.webContents.executeJavaScript('window.print()');
  });
});

ipcMain.handle('export-pdf', async (_event, docId, suggestedTitle) => {
  // 794px = exakt A4-bredd vid 96dpi — inget skalsteg från webbläsaren.
  // 12000px höjd rymmer ~10 A4-sidor utan clipping; TestPrintMode renderas
  // utanför App-chromen så overflow:hidden i App-roten påverkar inte längre.
  const win = new BrowserWindow({
    width: 794, height: 12000, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const url = `file://${resolveIndexHtmlPath()}?print=${docId}`;
  win.loadURL(url);
  await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  // Vänta på att React renderar klart (cover-bild, KaTeX etc.)
  await new Promise(resolve => setTimeout(resolve, 2000));

  let pdfBuffer;
  try {
    pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
    });
  } finally {
    win.destroy();
  }

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Spara PDF',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    defaultPath: `${(suggestedTitle || 'prov').replace(/[<>:"/\\|?*]/g, '_')}.pdf`,
  });
  if (!canceled && filePath && pdfBuffer) {
    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('pick-image', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Välj bild',
    filters: [{ name: 'Bilder', extensions: ['jpg','jpeg','png','gif','webp','svg'] }],
    properties: ['openFile'],
  });
  if (!filePaths || !filePaths[0]) return null;
  const fp = filePaths[0];
  const ext = path.extname(fp).toLowerCase().slice(1);
  const mimeMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml' };
  const mime = mimeMap[ext] || 'image/jpeg';
  const b64 = fs.readFileSync(fp).toString('base64');
  return { dataUrl: `data:${mime};base64,${b64}` };
});

ipcMain.handle('export-pdf-wordsearch', async (_event, docId, suggestedTitle) => {
  // 794px = A4 width at 96 dpi — content renders 1:1, no browser scaling
  // 2500px height fits two full A4 pages (2 × 1123px) without clipping
  const win = new BrowserWindow({
    width: 794, height: 2500, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  const url = `file://${resolveIndexHtmlPath()}?print=${docId}`;
  win.loadURL(url);
  await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  await new Promise(resolve => setTimeout(resolve, 2500));

  let pdfBuffer;
  try {
    pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4', printBackground: true,
      margins: { marginType: 'none' },
    });
  } finally {
    win.destroy();
  }

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Spara PDF — Ordpussel',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    defaultPath: `${(suggestedTitle || 'ordpussel').replace(/[<>:"/\\|?*]/g, '_')}.pdf`,
  });
  if (!canceled && filePath && pdfBuffer) {
    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true };
  }
  return { success: false };
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
  const https = require('https');
  return new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: { 'User-Agent': 'Provstudio-Lokalt/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    }
    get(url);
  });
});

ipcMain.handle('save-index-html', (_event, html, version) => {
  // Write to userData (always writable) — app.getAppPath() points to the
  // installed location which is read-only (Program Files / asar).
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const htmlDest = path.join(userDataDir, 'index.html');
  fs.writeFileSync(htmlDest, html, 'utf-8');

  // Sidecar with new version so getActiveVersion() picks it up after relaunch
  if (typeof version === 'string' && version) {
    const verDest = path.join(userDataDir, 'version.json');
    fs.writeFileSync(verDest, JSON.stringify({ version }, null, 2), 'utf-8');
  }

  app.relaunch();
  app.exit(0);
});

ipcMain.handle('get-app-version', () => getActiveVersion());
