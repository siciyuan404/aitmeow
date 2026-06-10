import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';

export default function SettingsPage() {
  const { port, dbPath, theme, loaded, setPort, setDbPath, setTheme, loadSettings, saveSettings } =
    useSettingsStore();
  const [portInput, setPortInput] = useState(String(port));
  const [dbPathInput, setDbPathInput] = useState(dbPath);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { setPortInput(String(port)); setDbPathInput(dbPath); }, [port, dbPath]);

  const handleSave = async () => {
    const portNum = parseInt(portInput, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { toast.error('Invalid port number'); return; }
    setPort(portNum);
    setDbPath(dbPathInput);
    await saveSettings();
    toast.success('Settings saved');
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure aitmeow</p>
      </div>

      <SettingsGroup title="Server">
        <SettingsField label="Port" description="HTTP and MCP server port (requires restart)">
          <input
            type="number" value={portInput}
            onChange={(e) => setPortInput(e.target.value)} min={1} max={65535}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </SettingsField>
        <SettingsField label="Database Path" description="SQLite database file location">
          <input
            type="text" value={dbPathInput}
            onChange={(e) => setDbPathInput(e.target.value)}
            placeholder="~/.aitmeow/aitmeow.db"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Theme</label>
          <div className="flex gap-3">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                  theme === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="About">
        <p className="text-sm text-gray-400">aitmeow v0.1.0</p>
        <p className="text-xs text-gray-500 mt-1">
          SVG tool service — MCP server for Claude Code
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Electron + React + TypeScript + Tailwind &middot; Rust backend (axum + sqlx + usvg + resvg)
        </p>
      </SettingsGroup>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
          Save Settings
        </button>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function SettingsField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {children}
      {description && <p className="text-[11px] text-gray-600 mt-1">{description}</p>}
    </div>
  );
}
