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
        {template.options.map((opt) => {
          const val = params[opt.key] ?? opt.default ?? '';
          const multiValues = opt.type === 'multiselect' ? new Set(String(val).split(',').map(s => s.trim()).filter(Boolean)) : null;
          return (
          <div key={opt.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">{opt.label}</label>
            {opt.type === 'color' && (
              <input
                type="color"
                value={val || '#3B82F6'}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                className="w-full h-8 rounded border border-slate-200 cursor-pointer"
              />
            )}
            {opt.type === 'select' && opt.options && (
              <select
                value={val}
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
                value={val}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                placeholder={opt.placeholder || ''}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            )}
            {opt.type === 'textarea' && (
              <textarea
                value={val}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                placeholder={opt.placeholder || ''}
                rows={opt.rows || 4}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            )}
            {opt.type === 'number' && (
              <input
                type="number"
                value={val}
                onChange={(e) => onParamChange(opt.key, e.target.value)}
                min={opt.min} max={opt.max} step={opt.step || 1}
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
                  value={val || '50'}
                  onChange={(e) => onParamChange(opt.key, e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs text-slate-500 w-10 text-right">
                  {val || '50'}
                </span>
              </div>
            )}
            {opt.type === 'boolean' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={val === 'true'}
                  onChange={(e) => onParamChange(opt.key, e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">{val === 'true' ? '是' : '否'}</span>
              </label>
            )}
            {opt.type === 'multiselect' && opt.options && (
              <div className="flex flex-wrap gap-1.5">
                {opt.options.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const next = new Set(multiValues);
                      if (next.has(item)) next.delete(item); else next.add(item);
                      onParamChange(opt.key, Array.from(next).join(','));
                    }}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                      multiValues?.has(item)
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
        <span>💡</span>
        <span>调整参数仅更新提示词预览，在工作台生成实际 SVG</span>
      </div>
    </div>
  );
}
