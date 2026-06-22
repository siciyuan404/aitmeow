import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export default function SettingsPage() {
  const { port, dbPath, theme, loaded, setPort, setDbPath, setTheme, loadSettings, saveSettings } = useSettingsStore();
  const [localPort, setLocalPort] = useState(String(port));
  const [localDbPath, setLocalDbPath] = useState(dbPath);
  const [saved, setSaved] = useState(false);

  const isPopup = window.location.hash.includes('/settings');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (loaded) {
      setLocalPort(String(port));
      setLocalDbPath(dbPath);
    }
  }, [loaded, port, dbPath]);

  const handleSave = async () => {
    const numPort = parseInt(localPort, 10) || 8765;
    setPort(numPort);
    setDbPath(localDbPath);
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <h1 className="text-lg font-bold">设置</h1>
        {isPopup && (
          <button
            onClick={() => window.close()}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            关闭
          </button>
        )}
      </div>

      {/* 主体 */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* 服务器 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm">服务端</h2>
          <div className="space-y-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">端口</span>
              <input
                type="number"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                placeholder="8765"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">数据库路径</span>
              <input
                type="text"
                value={localDbPath}
                onChange={(e) => setLocalDbPath(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                placeholder="留空使用内存模式"
              />
            </label>
          </div>
        </div>

        {/* 主题 —— 恢复 ! */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm">主题</h2>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  theme === t
                    ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {t === 'light' ? '☀️ 浅色' : t === 'dark' ? '🌙 深色' : '💻 跟随系统'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">切换后立即生效，设置会自动保存。</p>
        </div>

        {/* 关于 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="font-semibold text-sm">关于</h2>
          <p className="text-sm text-slate-500">
            aitmeow — AI 驱动的 SVG 生成器。
          </p>
          <p className="text-xs text-slate-400">修改配置后点击保存按钮生效。</p>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600">✅ 已保存</span>}
        <button
          onClick={handleSave}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-sm"
        >
          保存
        </button>
      </div>
    </div>
  );
}
