import { app, ipcMain, BrowserWindow } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';

// ── 状态机 ─────────────────────────────────────────────────────────
// Idle ──> Checking ──> Available ──> Downloading ──> Ready ──> Restarting
//   │                                                       │
//   └──> NotAvailable <─── (check 完成，无新版本)            │
//   │                                                       │
//   └──────────── Error <───────────────────────────────────┘
//   │
//   └── (retry from Error goes back to Checking)

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

interface UpdateState {
  seq: number;
  status: UpdateStatus;
  currentVersion: string;
  isPackaged: boolean;
  info?: {
    version: string;
    releaseName?: string;
    releaseNotes?: string;
    releaseDate?: string;
  };
  progress?: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  };
  error?: string;
}

let state: UpdateState = {
  seq: 0,
  status: 'idle',
  currentVersion: app.getVersion(),
  isPackaged: app.isPackaged,
};

let mainWindow: BrowserWindow | null = null;

// 进度节流：最多每 100ms 发一次 live event
let lastProgressEmit = 0;

// 标记当前检查是否为后台静默检查 —— 静默失败不弹错误打扰用户
let silentCheck = false;

function emit(partial: Partial<UpdateState>): void {
  state = { ...state, ...partial, seq: state.seq + 1 };
  mainWindow?.webContents.send('update:state-changed', state);
}

function getState(): UpdateState {
  return state;
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

function normalizeReleaseNotes(notes: UpdateInfo['releaseNotes']): string | undefined {
  if (!notes) return undefined;
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) return notes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n');
  return undefined;
}

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ETIMEDOUT|ENOTFOUND|ECONNREFUSED|ECONNRESET|socket hang up/i.test(msg)) {
    return '无法连接更新服务器，请检查网络后重试';
  }
  if (/404|Not Found/i.test(msg)) {
    return '未找到更新发布源';
  }
  if (/certificate|ssl|tls/i.test(msg)) {
    return '安全验证失败，请检查网络环境';
  }
  return msg;
}

export function initUpdater(): void {
  // 无感更新：后台自动下载，下次退出时自动安装，用户只在"新版本已就绪"这一刻被提示
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    lastProgressEmit = 0;
    emit({
      status: 'checking',
      error: undefined,
      info: undefined,
      progress: undefined,
    });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    emit({
      status: 'available',
      info: {
        version: info.version,
        releaseName: info.releaseName ?? undefined,
        releaseNotes: normalizeReleaseNotes(info.releaseNotes),
        releaseDate: info.releaseDate,
      },
      progress: undefined,
      error: undefined,
    });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    emit({
      status: 'not-available',
      info: info.version
        ? {
            version: info.version,
            releaseName: info.releaseName ?? undefined,
            releaseNotes: normalizeReleaseNotes(info.releaseNotes),
            releaseDate: info.releaseDate,
          }
        : undefined,
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    const now = Date.now();
    // 首字节和末字节始终发送；中间节流到 100ms
    const isFirst = progress.transferred === progress.total || progress.percent >= 100;
    const isStart = progress.transferred === 0;
    if (!isFirst && !isStart && now - lastProgressEmit < 100) return;
    lastProgressEmit = now;

    emit({
      status: 'downloading',
      progress: {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      },
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    emit({
      status: 'ready',
      info: {
        version: info.version,
        releaseName: info.releaseName ?? undefined,
        releaseNotes: normalizeReleaseNotes(info.releaseNotes),
        releaseDate: info.releaseDate,
      },
      progress: undefined,
      error: undefined,
    });
  });

  autoUpdater.on('error', (err: Error) => {
    // 后台静默检查失败不该打扰用户，静默回落到 idle；用户手动点检查时才展示错误
    if (silentCheck) {
      emit({ status: 'idle', error: undefined });
      return;
    }
    emit({
      status: 'error',
      error: classifyError(err),
    });
  });
}

/// 启动后延迟静默检查一次更新：有新版本就后台下载，没有或失败都不打扰用户
export function checkForUpdatesInBackground(delayMs = 5000): void {
  if (!app.isPackaged) return;

  setTimeout(async () => {
    if (state.status !== 'idle') return;
    silentCheck = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      emit({ status: 'idle', error: undefined });
    } finally {
      silentCheck = false;
    }
  }, delayMs);
}

export function registerUpdateHandlers(): void {
  ipcMain.handle('update:getState', () => getState());

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      return { success: false, error: '开发环境不支持更新检查' };
    }
    // 只在检查/下载进行中才拒绝，available / ready 允许重新检查（避免状态机卡死）
    if (state.status === 'checking' || state.status === 'downloading') {
      return { success: false, error: '更新检查正在进行中' };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err) {
      emit({ status: 'error', error: classifyError(err) });
      return { success: false, error: classifyError(err) };
    }
  });

  ipcMain.handle('update:download', async () => {
    if (state.status !== 'available') {
      return { success: false, error: '当前状态不允许下载' };
    }
    try {
      // downloadUpdate 返回下载完成的信号；期间 download-progress 事件会更新状态
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      emit({ status: 'error', error: classifyError(err) });
      return { success: false, error: classifyError(err) };
    }
  });

  ipcMain.handle('update:install', () => {
    if (state.status !== 'ready') {
      return { success: false, error: '更新尚未就绪' };
    }
    // 延迟执行，让 IPC 响应先返回给渲染器
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return { success: true };
  });
}
