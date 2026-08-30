import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useConnectionStore } from '@/stores/connectionStore';
import { type AppTheme, useSettingsStore } from '@/stores/settingsStore';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface SettingsDraft {
  port: string;
  dbPath: string;
  theme: AppTheme;
}

type SettingsSectionId = 'server' | 'data' | 'appearance' | 'developer' | 'about';

const themeOptions: Array<{ value: AppTheme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '系统' },
];

const settingsSections: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
}> = [
  { id: 'server', label: '服务端', description: '端口与连接状态' },
  { id: 'data', label: '数据', description: '数据库位置' },
  { id: 'appearance', label: '外观', description: '主题偏好' },
  { id: 'developer', label: '开发者功能', description: '调试与定位工具' },
  { id: 'about', label: '关于', description: '版本与环境' },
];

function validatePort(value: string) {
  const trimmed = value.trim();
  const port = Number(trimmed);

  if (!trimmed) return '请输入服务端口';
  if (!Number.isInteger(port)) return '端口必须是整数';
  if (port < 1 || port > 65535) return '端口范围为 1-65535';

  return null;
}

function FieldGroup({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {hint && <div className="min-h-5 text-xs leading-5">{hint}</div>}
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]' : 'bg-slate-300'}`}
    />
  );
}

function SectionShell({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const {
    port,
    dbPath,
    theme,
    uiLocatorEnabled,
    loaded,
    loadSettings,
    saveSettings,
    setUiLocatorEnabled,
  } = useSettingsStore();
  const {
    connected,
    connecting,
    port: connectedPort,
  } = useConnectionStore();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('server');
  const [draft, setDraft] = useState<SettingsDraft>({
    port: String(port),
    dbPath,
    theme,
  });
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [updatingLocator, setUpdatingLocator] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  useEffect(() => {
    if (!open || loaded) return;

    loadSettings().catch((err) => {
      const message = err instanceof Error ? err.message : '读取设置失败';
      toast.error(message);
    });
  }, [open, loaded, loadSettings]);

  useEffect(() => {
    if (!open) return;

    setDraft({
      port: String(port),
      dbPath,
      theme,
    });
  }, [open, port, dbPath, theme]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || activeSection !== 'about') return;
    const api = window.electronAPI;
    if (!api) return;

    const unsubscribe = api.onUpdateStateChanged((next) => {
      setUpdateState((prev) => (prev && prev.seq > next.seq ? prev : next));
    });

    api.updateGetState().then((initial) => {
      setUpdateState((prev) => (prev && prev.seq > initial.seq ? prev : initial));
    });

    return unsubscribe;
  }, [open, activeSection]);

  const portError = useMemo(() => validatePort(draft.port), [draft.port]);
  const normalizedPort = Number(draft.port.trim());
  const normalizedDbPath = draft.dbPath.trim();
  const isDirty = (
    normalizedPort !== port
    || normalizedDbPath !== dbPath
    || draft.theme !== theme
  );
  const canSave = loaded && isDirty && !portError && !saving;
  const isDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI);
  const connectionLabel = connecting ? '连接中' : connected ? '已连接' : '未连接';
  const portChangedInSession = connected && !portError && normalizedPort !== connectedPort;
  const activeMeta = settingsSections.find((section) => section.id === activeSection) ?? settingsSections[0];

  const resetDraft = () => {
    setDraft({
      port: String(port),
      dbPath,
      theme,
    });
  };

  const reloadSettings = async () => {
    setReloading(true);
    try {
      await loadSettings();
      toast.success('设置已重新载入');
    } catch (err) {
      const message = err instanceof Error ? err.message : '重新载入失败';
      toast.error(message);
    } finally {
      setReloading(false);
    }
  };

  const handleSave = async () => {
    const error = validatePort(draft.port);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        port: normalizedPort,
        dbPath: normalizedDbPath,
        theme: draft.theme,
      });
      toast.success('设置已保存');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存设置失败';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUiLocatorToggle = async (enabled: boolean) => {
    setUpdatingLocator(true);
    try {
      await setUiLocatorEnabled(enabled);
      toast.success(enabled ? 'UI 定位已开启' : 'UI 定位已关闭');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UI 定位设置失败';
      toast.error(message);
    } finally {
      setUpdatingLocator(false);
    }
  };

  const handleCheckUpdate = async () => {
    const result = await window.electronAPI?.updateCheck();
    if (!result?.success && result?.error) toast.error(result.error);
  };

  const handleDownloadUpdate = async () => {
    const result = await window.electronAPI?.updateDownload();
    if (!result?.success && result?.error) toast.error(result.error);
  };

  const handleInstallUpdate = async () => {
    await window.electronAPI?.updateInstall();
  };

  const renderContent = () => {
    if (!loaded) {
      return (
        <div className="flex h-full min-h-[320px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            正在读取设置
          </div>
        </div>
      );
    }

    if (activeSection === 'server') {
      return (
        <SectionShell>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <StatusDot active={connected} />
                {connectionLabel}
              </div>
              <div className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                当前端口 {connectedPort || port}
              </div>
            </div>
            {portChangedInSession && (
              <p className="mt-2 text-xs leading-5 text-amber-700">
                保存后下次启动使用端口 {normalizedPort}，当前会话仍在端口 {connectedPort}。
              </p>
            )}
          </div>

          <FieldGroup
            label="服务端口"
            hint={(
              <span className={portError ? 'text-red-600' : 'text-slate-500'}>
                {portError || '可用范围 1-65535'}
              </span>
            )}
          >
            <input
              type="number"
              min={1}
              max={65535}
              value={draft.port}
              onChange={(event) => setDraft((current) => ({ ...current, port: event.target.value }))}
              className={`h-10 w-full rounded-lg border px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${portError ? 'border-red-300' : 'border-slate-200'}`}
              placeholder="8765"
            />
          </FieldGroup>
        </SectionShell>
      );
    }

    if (activeSection === 'data') {
      return (
        <SectionShell>
          <FieldGroup
            label="数据库路径"
            hint={(
              <span className="break-all text-slate-500">
                {normalizedDbPath || '保存为空值后，服务端会回退到默认数据库路径。'}
              </span>
            )}
          >
            <input
              type="text"
              value={draft.dbPath}
              onChange={(event) => setDraft((current) => ({ ...current, dbPath: event.target.value }))}
              placeholder="默认数据目录"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </FieldGroup>
        </SectionShell>
      );
    }

    if (activeSection === 'appearance') {
      return (
        <SectionShell>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {themeOptions.map((option) => {
              const active = draft.theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, theme: option.value }))}
                  className={`h-9 rounded-md text-xs font-medium transition-colors ${active ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </SectionShell>
      );
    }

    if (activeSection === 'developer') {
      return (
        <SectionShell>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">显示 UI 定位</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  开启后显示页面布局轮廓，点击界面元素会弹出定位信息并支持复制。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={uiLocatorEnabled}
                disabled={updatingLocator}
                onClick={() => handleUiLocatorToggle(!uiLocatorEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${uiLocatorEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${uiLocatorEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
            使用方式：开启后关闭设置弹窗，点击任意界面元素查看 CSS Selector、文本、尺寸和位置，再复制定位信息。
          </div>
        </SectionShell>
      );
    }

    return (
      <SectionShell>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <span className="text-slate-500">版本</span>
            <span className="font-medium text-slate-800">aitmeow v{updateState?.currentVersion ?? '0.1.0'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <span className="text-slate-500">运行环境</span>
            <span className="font-medium text-slate-800">{isDesktop ? 'Electron 桌面端' : '浏览器预览'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">后端</span>
            <span className="font-medium text-slate-800">Rust MCP 服务</span>
          </div>
        </div>

        {isDesktop && updateState && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            {(() => {
              const s = updateState;

              if (!s.isPackaged) {
                return (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    开发环境不支持更新检查
                  </div>
                );
              }

              const btnBase = 'h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
              const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700`;
              const btnSecondary = `${btnBase} text-slate-600 hover:bg-white hover:text-slate-900 ring-1 ring-slate-200`;

              switch (s.status) {
                case 'idle':
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">检查是否有新版本</span>
                        <button type="button" onClick={handleCheckUpdate} className={btnSecondary}>检查更新</button>
                      </div>
                      <p className="text-xs text-slate-500">启动后会自动检查，有新版本在后台下载，不打扰当前操作。</p>
                    </div>
                  );

                case 'checking':
                  return (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                      正在检查更新...
                    </div>
                  );

                case 'available':
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-700">发现新版本</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                            v{s.info?.version}
                          </span>
                        </div>
                        <button type="button" onClick={handleDownloadUpdate} className={btnPrimary}>下载更新</button>
                      </div>
                      {s.info?.releaseNotes && (
                        <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white px-3 py-2">
                          <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{s.info.releaseNotes}</pre>
                        </div>
                      )}
                    </div>
                  );

                case 'not-available':
                  return (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        当前已是最新版本
                      </span>
                      <button type="button" onClick={handleCheckUpdate} className={btnSecondary}>检查更新</button>
                    </div>
                  );

                case 'downloading': {
                  const pct = Math.round(s.progress?.percent ?? 0);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">下载更新中...</span>
                        <span className="font-medium text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-150"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                case 'ready':
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">
                          新版本已就绪
                          <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                            v{s.info?.version}
                          </span>
                        </span>
                        <button type="button" onClick={handleInstallUpdate} className={btnPrimary}>重启并安装</button>
                      </div>
                      <p className="text-xs text-slate-500">不重启也没关系，关闭程序时会自动完成安装。</p>
                    </div>
                  );

                case 'error':
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-red-600">{s.error}</span>
                      <button type="button" onClick={handleCheckUpdate} className={`${btnSecondary} shrink-0`}>重试</button>
                    </div>
                  );

                default:
                  return null;
              }
            })()}
          </div>
        )}
      </SectionShell>
    );
  };

  if (!open) return null;

  return (
    <div data-ui-locator-ignore="true" className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[min(720px,calc(100vh-48px))] w-[min(880px,calc(100vw-48px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <h2 id="settings-title" className="text-base font-semibold text-slate-900">设置</h2>
              {isDirty && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                  未保存
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">桌面端偏好与服务配置</p>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {settingsSections.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${active ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
                >
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{section.description}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <StatusDot active={connected} />
              {connectionLabel}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900">{activeMeta.label}</h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">{activeMeta.description}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={reloadSettings}
                disabled={reloading || saving}
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="重新载入"
                aria-label="重新载入设置"
              >
                <svg className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v6h-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="关闭"
                aria-label="关闭设置"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {renderContent()}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={resetDraft}
              disabled={!isDirty || saving}
              className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              撤销更改
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-9 min-w-28 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
