import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import StatusIndicator from '@/components/common/StatusIndicator';
import logoUrl from '@/assets/logo.svg';

type InstallGuide = 'mcp' | 'cli' | 'skill';

interface TopBarProps {
  connected: boolean;
  port: number;
  onSettingsClick: () => void;
}

const guideTabs: Array<{ id: InstallGuide; label: string }> = [
  { id: 'mcp', label: 'MCP' },
  { id: 'cli', label: 'CLI' },
  { id: 'skill', label: 'Skill' },
];

function winMin() { window.electronAPI?.windowMinimize(); }
function winMax() { window.electronAPI?.windowMaximize(); }
function winClose() { window.electronAPI?.windowClose(); }

export default function TopBar({
  connected,
  port,
  onSettingsClick,
}: TopBarProps) {
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<InstallGuide>('mcp');
  const mcpUrl = `http://127.0.0.1:${port}/mcp`;

  return (
    <header
      className="h-11 border-b border-slate-200 bg-white px-4 flex items-center justify-between select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img src={logoUrl} alt="" className="w-6 h-6 rounded-[5px] shrink-0" />
        <span className="font-bold text-[15px] text-slate-800 tracking-tight">aitmeow</span>
      </div>

      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Dialog.Root open={mcpDialogOpen} onOpenChange={setMcpDialogOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 rounded border border-transparent px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              title="查看安装说明"
            >
              <StatusIndicator status={connected ? 'connected' : 'disconnected'} size="sm" />
              <span>{connected ? '已连接' : '离线'}</span>
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35" />
            <Dialog.Content
              className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <Dialog.Title className="text-sm font-semibold text-slate-900">
                    服务安装说明
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-xs text-slate-500">
                    选择一种接入方式查看配置。
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="关闭"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </Dialog.Close>
              </div>

              <div className="space-y-4 px-5 py-4 text-xs text-slate-600">
                <div className="grid grid-cols-3 rounded-md border border-slate-200 bg-slate-50 p-1">
                  {guideTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveGuide(tab.id)}
                      className={`h-7 rounded text-[11px] font-medium transition-colors ${
                        activeGuide === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeGuide === 'mcp' && (
                  <>
                    <section>
                      <div className="mb-1.5 font-medium text-slate-800">服务状态</div>
                      <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                        <StatusIndicator status={connected ? 'connected' : 'disconnected'} size="sm" />
                        <span>{connected ? `运行中，端口 ${port}` : `未连接，目标端口 ${port}`}</span>
                      </div>
                    </section>

                    <section>
                      <div className="mb-1.5 font-medium text-slate-800">MCP 地址</div>
                      <code className="block overflow-x-auto rounded border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-100">
                        {mcpUrl}
                      </code>
                    </section>

                    <section>
                      <div className="mb-1.5 font-medium text-slate-800">可用工具</div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                        {['session_state', 'template_list', 'template_get', 'template_compile', 'template_create', 'svg_preview'].map((tool) => (
                          <code key={tool} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono">
                            {tool}
                          </code>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="mb-1.5 font-medium text-slate-800">客户端配置示例</div>
                      <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-[11px] leading-5 text-slate-100">
{`{
  "mcpServers": {
    "aitmeow": {
      "transport": "http",
      "url": "${mcpUrl}"
    }
  }
}`}
                      </pre>
                      <p className="mt-2 leading-5">
                        配置后重启 MCP 客户端或新开 Agent 会话，让客户端重新读取工具列表。
                      </p>
                    </section>
                  </>
                )}

                {activeGuide === 'cli' && (
                  <section className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <div className="text-sm font-medium text-slate-800">CLI</div>
                    <p className="mt-2 text-xs text-slate-500">待定</p>
                  </section>
                )}

                {activeGuide === 'skill' && (
                  <section className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <div className="text-sm font-medium text-slate-800">Skill</div>
                    <p className="mt-2 text-xs text-slate-500">待定</p>
                  </section>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

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
