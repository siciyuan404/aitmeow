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
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { toast.error('Invalid port'); return; }
    setPort(portNum);
    setDbPath(dbPathInput);
    await saveSettings();
    toast.success('Settings saved');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-80 bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col gap-5 overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server</h3>
          <div>
            <label className="text-xs text-slate-500">Port</label>
            <input type="number" value={portInput} onChange={(e) => setPortInput(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500">DB Path</label>
            <input type="text" value={dbPathInput} onChange={(e) => setDbPathInput(e.target.value)} placeholder="~/.aitmeow/aitmeow.db"
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</h3>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                  theme === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1 mt-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About</h3>
          <p className="text-sm text-slate-600">aitmeow v0.1.0</p>
          <p className="text-[11px] text-slate-400">SVG tool service — MCP server for Claude Code</p>
          <p className="text-[11px] text-slate-300">React + Tailwind + Rust backend</p>
        </div>

        <button onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
}
