import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { registerIpcHandlers } from './ipc/registry';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 8765;
let serverRunning = false;

function findServerBinary(): string | null {
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, '../../target/debug/aitmeow-server.exe'),
    path.join(__dirname, '../../target/release/aitmeow-server.exe'),
    path.join(process.resourcesPath || '', 'aitmeow-server.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function startServer() {
  const bin = findServerBinary();
  if (!bin) {
    console.warn('aitmeow-server binary not found, server must be started manually');
    return;
  }

  const args = ['--memory', '--port', String(serverPort)];

  // If templates dir exists next to the binary, pass it
  const fs = require('fs');
  const templateDir = path.join(__dirname, '../../desktop/templates');
  if (fs.existsSync(templateDir)) {
    args.push('--template-dir', templateDir);
  }

  console.log(`Starting server: ${bin} ${args.join(' ')}`);
  serverProcess = spawn(bin, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString();
    console.log('[server]', msg.trim());
    if (msg.includes('Listening on')) {
      serverRunning = true;
      mainWindow?.webContents.send('connection:status-changed', { running: true, port: serverPort });
    }
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[server]', data.toString().trim());
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    serverRunning = false;
    serverProcess = null;
    mainWindow?.webContents.send('connection:status-changed', { running: false, port: serverPort });
  });

  // Fallback: if we don't get "Listening on" message, assume it started after 3s
  setTimeout(() => {
    if (!serverRunning && serverProcess) {
      serverRunning = true;
      mainWindow?.webContents.send('connection:status-changed', { running: true, port: serverPort });
    }
  }, 3000);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'aitmeow',
    backgroundColor: '#f3f4f6',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发模式：优先连接 Vite dev server，不可用时才加载 dist 产物
  const devServerUrl = 'http://localhost:5173';
  let loadedFromDev = false;
  try {
    await fetch(devServerUrl);
    await mainWindow.loadURL(devServerUrl);
    loadedFromDev = true;
    console.log('[main] loaded from dev server:', devServerUrl);
  } catch {
    console.log('[main] dev server not available');
  }
  if (!loadedFromDev) {
    const distPath = path.join(__dirname, '../dist/index.html');
    const fs = require('fs');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
      console.log('[main] loaded from dist:', distPath);
    } else {
      console.error('[main] no build found, cannot load window');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  startServer();
  createWindow();

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
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

ipcMain.handle('connection:start', async (_event, port: number) => {
  if (serverRunning) return { success: false, error: 'Server already running' };
  serverPort = port;
  startServer();
  return { success: true, port };
});

ipcMain.handle('connection:stop', async () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  serverRunning = false;
  return { success: true };
});

ipcMain.handle('connection:status', async () => {
  return { running: serverRunning, port: serverPort };
});
