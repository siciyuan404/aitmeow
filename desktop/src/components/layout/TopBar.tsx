import StatusIndicator from '@/components/common/StatusIndicator';

interface TopBarProps {
  connected: boolean;
  port: number;
  onConnectionClick: () => void;
  onSettingsClick: () => void;
}

export default function TopBar({ connected, port, onConnectionClick, onSettingsClick }: TopBarProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between select-none shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-blue-500/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">aitmeow</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onConnectionClick}
          className="flex items-center gap-2 text-xs font-medium bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <StatusIndicator status={connected ? 'connected' : 'disconnected'} size="sm" />
          <span>{connected ? port : 'Offline'}</span>
        </button>
        <button
          onClick={onSettingsClick}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
