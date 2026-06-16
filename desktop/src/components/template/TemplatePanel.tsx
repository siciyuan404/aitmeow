import { useTemplateStore } from '@/stores/templateStore';
import BrowseMode from './modes/BrowseMode';
import PreviewMode from './modes/PreviewMode';

export default function TemplatePanel() {
  const panelExpanded = useTemplateStore(s => s.panelExpanded);
  const activeMode = useTemplateStore(s => s.activeMode);
  const togglePanel = useTemplateStore(s => s.togglePanel);
  const setMode = useTemplateStore(s => s.setMode);

  if (!panelExpanded) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">模板管理</h2>
        </div>
        <button
          onClick={togglePanel}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          title="关闭面板"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setMode('browse')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeMode === 'browse'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          📚 浏览
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeMode === 'preview'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          🎯 预览
        </button>
        <button
          onClick={() => setMode('edit')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeMode === 'edit'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
          disabled
        >
          ✏️ 编辑
        </button>
        <button
          onClick={() => setMode('manage')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeMode === 'manage'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
          disabled
        >
          ⚙️ 管理
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'browse' && <BrowseMode />}
        {activeMode === 'preview' && <PreviewMode />}
        {activeMode === 'edit' && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🚧</div>
              <div className="text-sm">编辑模式开发中</div>
            </div>
          </div>
        )}
        {activeMode === 'manage' && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🚧</div>
              <div className="text-sm">管理模式开发中</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
