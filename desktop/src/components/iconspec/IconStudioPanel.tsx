import LeftPanel from '@/components/panels/LeftPanel';
import IconSpecPanel from '@/components/iconspec/IconSpecPanel';
import { useIconStudioStore } from '@/stores/iconStudioStore';
import type { Template } from '@/services/api';

interface IconStudioPanelProps {
  selectedTemplate: Template | null;
  templateParams: Record<string, string>;
  onSelectTemplate: (t: Template | null) => void;
  onParamsChange: (p: Record<string, string>) => void;
}

export default function IconStudioPanel({
  selectedTemplate,
  templateParams,
  onSelectTemplate,
  onParamsChange,
}: IconStudioPanelProps) {
  const enabled = useIconStudioStore((s) => s.enabled);
  const setEnabled = useIconStudioStore((s) => s.setEnabled);

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
      <div className="p-3 pb-0 shrink-0">
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
              !enabled ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            模板
          </button>
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
              enabled ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            图标设定
          </button>
        </div>
      </div>
      {enabled ? (
        <div className="flex-1 overflow-y-auto pb-3">
          <IconSpecPanel />
        </div>
      ) : (
        <LeftPanel
          selectedTemplate={selectedTemplate}
          templateParams={templateParams}
          onSelectTemplate={onSelectTemplate}
          onParamsChange={onParamsChange}
        />
      )}
    </aside>
  );
}
