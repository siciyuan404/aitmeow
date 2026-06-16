import type { TemplateDefinition } from '@/types/template';

interface PreviewParamPanelProps {
  template: TemplateDefinition;
  params: Record<string, string>;
  onParamChange: (key: string, value: string) => void;
}

export default function PreviewParamPanel({
  template,
  params,
  onParamChange
}: PreviewParamPanelProps) {
  if (!template.options || template.options.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <div className="text-sm font-semibold text-slate-700 mb-3">参数配置</div>

      <div className="space-y-3">
        {template.options.map((opt) => (
          <div key={opt.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">{opt.label}</label>
            {opt.type === 'color' && (
              <input
                type="color"
                value={params[opt.key] || opt.default || '#3B82F6'}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                className="w-full h-8 rounded border border-slate-200 cursor-pointer"
              />
            )}
            {opt.type === 'select' && opt.options && (
              <select
                value={params[opt.key] || opt.default || ''}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              >
                {opt.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            {opt.type === 'text' && (
              <input
                type="text"
                value={params[opt.key] || opt.default || ''}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                placeholder={opt.placeholder || ''}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            )}
            {opt.type === 'range' && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={opt.min || 0}
                  max={opt.max || 100}
                  step={opt.step || 1}
                  value={params[opt.key] || opt.default || '50'}
                  onChange={(e) => onParamChange(opt.key, e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs text-slate-500 w-10 text-right">
                  {params[opt.key] || opt.default || '50'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
        <span>💡</span>
        <span>调整参数仅更新提示词预览，在工作台生成实际 SVG</span>
      </div>
    </div>
  );
}
