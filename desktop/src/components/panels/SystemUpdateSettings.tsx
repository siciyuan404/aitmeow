import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function formatBytes(value?: number) {
  if (!value || value <= 0) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value?: string | null) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return date.toLocaleString();
}

function shortReleaseNotes(value?: string | null) {
  const text = value?.trim();
  if (!text) return '此版本没有发布说明。';
  return text.length > 220 ? `${text.slice(0, 220).trim()}...` : text;
}

export default function SystemUpdateSettings() {
  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const isDesktop = Boolean(electronAPI);
  const [status, setStatus] = useState<ElectronUpdateStatus | null>(null);
  const [result, setResult] = useState<ElectronUpdateCheckResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electronAPI) return;

    let cancelled = false;
    setLoadingStatus(true);
    electronAPI.updateGetStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '读取版本信息失败';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [electronAPI]);

  const currentVersion = result?.currentVersion || status?.currentVersion || '未知';
  const repository = result?.repository || status?.repository || 'siciyuan404/aitmeow';
  const expectedAsset = result?.expectedAssetName || status?.expectedAssetName || 'AitMeow-win32-x64.zip';
  const latestLabel = result?.latestTag || (checking ? '检查中...' : '尚未检查');
  const updateStateLabel = useMemo(() => {
    if (!result) return '未检查';
    return result.updateAvailable ? '发现新版本' : '已是最新版本';
  }, [result]);

  const checkForUpdates = async () => {
    if (!electronAPI) return;

    setChecking(true);
    setError(null);
    try {
      const next = await electronAPI.updateCheck();
      setResult(next);
      if (next.updateAvailable) {
        toast.success(`发现新版本 ${next.latestTag || next.latestVersion}`);
      } else {
        toast.success('当前已是最新版本');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '检查更新失败';
      setError(message);
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const openDownload = async () => {
    if (!electronAPI) return;

    setOpening(true);
    try {
      const opened = await electronAPI.updateOpenDownload(result?.assetUrl);
      toast.success(opened.url.includes('/download/') ? '已打开更新包下载链接' : '已打开 GitHub Release 页面');
    } catch (err) {
      const message = err instanceof Error ? err.message : '打开下载链接失败';
      toast.error(message);
    } finally {
      setOpening(false);
    }
  };

  const openRelease = async () => {
    if (!electronAPI) return;

    setOpening(true);
    try {
      await electronAPI.updateOpenRelease(result?.releaseUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : '打开 Release 页面失败';
      toast.error(message);
    } finally {
      setOpening(false);
    }
  };

  if (!isDesktop) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        系统更新仅在 Electron 桌面端可用。浏览器预览模式不会检查或下载桌面安装包。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">系统更新</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              从 GitHub Releases 获取桌面端更新包。
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${result?.updateAvailable ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {loadingStatus ? '读取中' : updateStateLabel}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <span className="text-slate-500">当前版本</span>
          <span className="font-medium text-slate-800">v{currentVersion}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <span className="text-slate-500">最新版本</span>
          <span className="font-medium text-slate-800">{latestLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <span className="text-slate-500">更新源</span>
          <span className="break-all text-right font-medium text-slate-800">{repository}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <span className="text-slate-500">Windows 包</span>
          <span className="break-all text-right font-medium text-slate-800">
            {result?.assetName || expectedAsset}
            {result?.assetSize ? ` · ${formatBytes(result.assetSize)}` : ''}
          </span>
        </div>
        {result?.publishedAt && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <span className="text-slate-500">发布时间</span>
            <span className="font-medium text-slate-800">{formatDate(result.publishedAt)}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium text-slate-500">发布说明</div>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">
            {shortReleaseNotes(result.releaseNotes)}
          </p>
        </div>
      )}

      {result?.updateAvailable && !result.assetUrl && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          最新 Release 中未找到 {expectedAsset}，请打开 Release 页面确认产物。
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={checkForUpdates}
          disabled={checking || loadingStatus}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {checking ? '检查中...' : '检查更新'}
        </button>
        <button
          type="button"
          onClick={openDownload}
          disabled={opening || checking || !result?.updateAvailable}
          className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下载更新
        </button>
        <button
          type="button"
          onClick={openRelease}
          disabled={opening}
          className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          查看 Release
        </button>
      </div>
    </div>
  );
}
