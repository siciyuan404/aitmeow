import { useState, useEffect } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import ExampleViewer from '../components/ExampleViewer';
import ExampleThumbnailList from '../components/ExampleThumbnailList';
import PreviewParamPanel from '../components/PreviewParamPanel';
import PromptPreview from '../components/PromptPreview';
import TemplateQuickPicker from '../components/TemplateQuickPicker';

export default function PreviewMode() {
  const templates = useTemplateStore(s => s.templates);
  const selectedTemplate = useTemplateStore(s => s.selectedTemplate);
  const templateParams = useTemplateStore(s => s.templateParams);
  const selectTemplate = useTemplateStore(s => s.selectTemplate);
  const setParams = useTemplateStore(s => s.setParams);
  const togglePanel = useTemplateStore(s => s.togglePanel);

  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  const currentTemplate = templates.find(t => t.name === selectedTemplate);
  const examples = currentTemplate?.examples || [];
  const activeExample = examples[activeExampleIndex];

  // Reset example index when template changes
  useEffect(() => {
    setActiveExampleIndex(0);
  }, [selectedTemplate]);

  // Ctrl+P to open quick picker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickPicker(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApplyToWorkspace = () => {
    // Close panel - selected template and params are already in store
    togglePanel();
    // Workspace will use the selected template and params from store
  };

  const handleParamChange = (key: string, value: string) => {
    setParams({ ...templateParams, [key]: value });
  };

  const handleSelectTemplate = (name: string) => {
    selectTemplate(name);
    setActiveExampleIndex(0);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      {/* Template selector */}
      <div className="mb-4">
        <label className="text-sm font-semibold text-slate-700 block mb-2">选择模板</label>
        <button
          onClick={() => setShowQuickPicker(true)}
          className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-left hover:border-blue-400 flex items-center justify-between transition-colors"
        >
          <span className="text-sm text-slate-700">
            {currentTemplate?.name || '请选择模板'}
          </span>
          <span className="text-slate-400">▼</span>
        </button>
        <div className="mt-1 text-xs text-slate-500">
          快捷键: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded">Ctrl+P</kbd>
        </div>
      </div>

      {currentTemplate ? (
        <>
          {/* Example viewer */}
          <ExampleViewer
            svgContent={activeExample?.svg_content || null}
            description={activeExample?.description}
          />

          {/* Example thumbnails */}
          {examples.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                示例图 ({examples.length})
              </div>
              <ExampleThumbnailList
                examples={examples}
                activeIndex={activeExampleIndex}
                onSelect={setActiveExampleIndex}
              />
            </div>
          )}

          {/* Parameter panel */}
          {currentTemplate.options.length > 0 && (
            <PreviewParamPanel
              template={currentTemplate}
              params={templateParams}
              onParamChange={handleParamChange}
            />
          )}

          {/* Prompt preview */}
          <PromptPreview template={currentTemplate} params={templateParams} />

          {/* Apply button */}
          <button
            onClick={handleApplyToWorkspace}
            className="mt-4 w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            应用到工作台
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="text-5xl mb-3">🎯</div>
            <div className="text-base font-medium mb-1">请选择一个模板进行预览</div>
            <div className="text-xs mt-2 text-slate-500">
              点击上方按钮或按 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded">Ctrl+P</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Quick picker modal */}
      {showQuickPicker && (
        <TemplateQuickPicker
          templates={templates}
          value={selectedTemplate}
          onChange={handleSelectTemplate}
          onClose={() => setShowQuickPicker(false)}
        />
      )}
    </div>
  );
}
