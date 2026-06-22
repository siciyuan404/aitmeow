import { useState, useEffect } from 'react';

interface TopBarProps {
  connected: boolean;
  port: number;
  onTemplateClick: () => void;
}

export default function TopBar({ connected, port, onTemplateClick }: TopBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.windowIsMaximized) {
      window.electronAPI.windowIsMaximized().then(setIsMaximized);
    }
  }, []);

  const dotColor = connected ? 'bg-green-400' : 'bg-red-400';

  return (
    <div
      className="h-9 bg-white border-b border-slate-200 flex items-center justify-between px-2 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* 左侧 */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-xs font-bold text-violet-600 ml-1">aitmeow</span>
        <button
          onClick={onTemplateClick}
          className="text-xs text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100"
        >
          模板
        </button>
      </div>

      {/* 中间：连接状态 */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs text-slate-500">
          {connected ? `已连接 :${port}` : '未连接'}
        </span>
      </div>

      {/* 右侧：设置 + 窗口控制 */}
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.electronAPI?.windowOpenSettings()}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded mr-1"
          title="设置"
        >
          ⚙
        </button>
        <button
          onClick={() => window.electronAPI?.windowMinimize()}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 hover:bg-slate-100"
        >
          ─
        </button>
        <button
          onClick={() => {
            window.electronAPI?.windowMaximize();
            setIsMaximized(!isMaximized);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 hover:bg-slate-100"
        >
          {isMaximized ? '❐' : '□'}
        </button>
        <button
          onClick={() => window.electronAPI?.windowClose()}
          className="text-xs text-slate-400 hover:text-red-500 px-2 py-0.5 hover:bg-red-50 rounded-tr"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
