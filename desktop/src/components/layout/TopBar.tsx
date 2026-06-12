import StatusIndicator from '@/components/common/StatusIndicator';

interface TopBarProps {
  connected: boolean;
  port: number;
  onSettingsClick: () => void;
}

function winMin() { window.electronAPI?.windowMinimize(); }
function winMax() { window.electronAPI?.windowMaximize(); }
function winClose() { window.electronAPI?.windowClose(); }

export default function TopBar({ connected, port, onSettingsClick }: TopBarProps) {
  return (
    <header
      className="h-11 border-b border-slate-200 bg-white px-4 flex items-center justify-between select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-sm shadow-blue-500/30">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="font-bold text-[15px] text-slate-800 tracking-tight">aitmeow</span>
      </div>

      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 px-2.5 py-1">
          <StatusIndicator status={connected ? 'connected' : 'disconnected'} size="sm" />
          <span>{connected ? `端口 ${port}` : '连接中...'}</span>
        </div>
        <button onClick={onSettingsClick} className="text-slate-500 hover:text-slate-700 transition-colors p-0.5">
          <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {typeof window !== 'undefined' && window.electronAPI && (
        <div className="flex items-center ml-1">
          <button onClick={winMin} className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors" title="最小化">
            <svg className="w-3 h-3" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="1" fill="currentColor"/></svg>
          </button>
          <button onClick={winMax} className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors" title="最大化">
            <svg className="w-3 h-3" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button onClick={winClose} className="text-slate-500 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="关闭">
            <svg className="w-3 h-3" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
        )}
      </div>
    </header>
  );
}
