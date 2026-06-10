import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { port, dbPath, theme, loaded, setPort, setDbPath, setTheme, loadSettings, saveSettings } = useSettingsStore();
  const [portInput, setPortInput] = useState(String(port));
  const [dbPathInput, setDbPathInput] = useState(dbPath);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { setPortInput(String(port)); setDbPathInput(dbPath); }, [port, dbPath]);

  const handleSave = async () => {
    const portNum = parseInt(portInput, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { toast.error('端口号无效'); return; }
    setPort(portNum);
    setDbPath(dbPathInput);
    await saveSettings();
    toast.success('设置已保存');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-80 bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">设置</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">服务端</h3>
          <div>
            <label className="text-xs text-slate-600">端口号</label>
            <input type="number" value={portInput} onChange={(e) => setPortInput(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700" />
          </div>
          <div>
            <label className="text-xs text-slate-600">数据库路径</label>
            <input type="text" value={dbPathInput} onChange={(e) => setDbPathInput(e.target.value)} placeholder="~/.aitmeow/aitmeow.db"
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 placeholder:text-slate-400" />
          </div>
        </div>

{/* TODO: theme switching - re-enable when dark mode is implemented */}

        <div className="space-y-1 mt-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">关于</h3>
          <p className="text-sm text-slate-700">aitmeow v0.1.0</p>
          <p className="text-[11px] text-slate-500">SVG 工具服务 — Claude Code 的 MCP 服务端</p>
          <p className="text-[11px] text-slate-500">Electron + React + Rust 后端</p>
        </div>

        <button onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
          保存设置
        </button>
      </div>
    </div>
  );
}
