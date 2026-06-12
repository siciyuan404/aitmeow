import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api, type Template, type TemplateOption } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';
import ColorPicker from '@/components/ColorPicker';
import VisualSelect, { getIconForValue } from '@/components/shapes';

interface LeftPanelProps {
  selectedTemplate: Template | null;
  templateParams: Record<string, string>;
  onSelectTemplate: (t: Template | null) => void;
  onParamsChange: (p: Record<string, string>) => void;
}

export default function LeftPanel({
  selectedTemplate,
  templateParams,
  onSelectTemplate,
  onParamsChange,
}: LeftPanelProps) {
  const { connected } = useConnectionStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['brand']));
  const [referenceSvg, setReferenceSvg] = useState<{ id: string; name: string; svg_content: string } | null>(null);

  useEffect(() => {
    if (!connected) return;
    api.listTemplates().then((d) => {
      setTemplates(d.templates);
      setCategories(d.categories);
      const all = new Set<string>();
      d.categories.forEach((c) => all.add(c));
      setExpanded(all);
    }).catch((err: Error) => toast.error('加载模板失败: ' + err.message));
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    api.sessionState().then((s) => {
      if ((s as any).reference_svg) {
        setReferenceSvg((s as any).reference_svg);
      }
    }).catch((err: Error) => toast.error('获取会话状态失败: ' + err.message));
  }, [connected, selectedTemplate]);

  const byCategory = new Map<string, Template[]>();
  templates.forEach((t) => {
    const c = t.category || 'general';
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(t);
  });

  const toggleCat = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleParamChange = (key: string, value: string) => {
    onParamsChange({ ...templateParams, [key]: value });
  };

  const handleClearReference = async () => {
    try {
      await api.setReferenceSvg(null);
      setReferenceSvg(null);
    } catch (err: any) { toast.error('清除参考图失败: ' + (err.message || err)); }
  };

  const catLabel: Record<string, string> = {
    brand: '品牌标志',
    chart: '数据图表',
    illustration: '插画',
    icon: '图标',
    infographic: '信息图',
  };

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
      {/* fixed header */}
      <div className="p-3 pb-0 shrink-0">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          模板
        </div>
      </div>

      {/* scrollable template list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {categories.map((cat) => (
          <div key={cat} className="mb-1">
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium text-sm transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-[14px] h-[14px] text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
                {catLabel[cat] || cat}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                {byCategory.get(cat)?.length || 0}
              </span>
            </button>

            {expanded.has(cat) && (byCategory.get(cat) || []).map((tmpl) => (
              <TemplateCard
                key={tmpl.name}
                template={tmpl}
                selected={selectedTemplate?.name === tmpl.name}
                onSelect={() => onSelectTemplate(tmpl)}
              />
            ))}
          </div>
        ))}

        {!connected && (
          <p className="text-slate-500 text-xs text-center py-8">连接服务端以加载模板</p>
        )}
      </div>

      {/* reference svg indicator */}
      {referenceSvg && (
        <div className="shrink-0 mx-3 mb-1 p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden rounded bg-white border border-slate-200 shrink-0">
            <div className="w-full h-full flex items-center justify-center scale-[0.25]" dangerouslySetInnerHTML={{ __html: referenceSvg.svg_content }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-slate-700 truncate">{referenceSvg.name}</div>
            <div className="text-[9px] text-amber-600">参考图已设置</div>
          </div>
          <button onClick={handleClearReference} className="text-slate-400 hover:text-red-500 transition-colors" title="清除参考">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* options section — fixed bottom when template selected */}
      {selectedTemplate && selectedTemplate.options.length > 0 && (
        <div className="border-t border-slate-200 px-3 py-2.5 shrink-0 max-h-[280px] overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">选项</div>
          {selectedTemplate.options.map((opt) => (
            <OptionField
              key={opt.key}
              option={opt}
              value={templateParams[opt.key] || opt.default || ''}
              onChange={(v) => handleParamChange(opt.key, v)}
            />
          ))}
        </div>
      )}

      {/* compiled prompt preview */}
      {selectedTemplate && (
        <div className="border-t border-slate-200 px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <svg className="w-3 h-3 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agent 提示词预览</span>
          </div>
          <div className="bg-violet-50/50 border border-violet-200/60 rounded-xl p-2.5 text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto">
            {compilePrompt(selectedTemplate, templateParams)}
          </div>
        </div>
      )}
    </aside>
  );
}

function compilePrompt(tmpl: Template, params: Record<string, string>): string {
  if (!tmpl.prompt_template) return '(无提示词模板)';
  let result = tmpl.prompt_template;
  for (const opt of tmpl.options) {
    const val = params[opt.key] || opt.default || '';
    result = result.split(`{{${opt.key}}}`).join(val);
  }
  if (result.includes('{{')) {
    result = result.replace(/\{\{.+?\}\}/g, '___');
  }
  return result;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = getIconForValue(template.name);
  return (
    <div
      onClick={onSelect}
      className={`ml-3 p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all mb-1 relative ${
        selected
          ? 'border-blue-500 ring-1 ring-blue-500/10 bg-white shadow-md shadow-blue-500/5'
          : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm shadow-slate-50'
      }`}
    >
      {selected && (
        <div className="absolute right-2 top-2 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
          ✓
        </div>
      )}
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        {Icon ? (
          <Icon className="w-4 h-4" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-slate-800 truncate">{template.description || template.name}</span>
        {template.description && template.description !== template.name && (
          <span className="text-[10px] text-slate-500 truncate">{template.name}</span>
        )}
      </div>
    </div>
  );
}

function OptionField({ option, value, onChange }: { option: TemplateOption; value: string; onChange: (v: string) => void }) {
  const { label, type, placeholder, options, default: def, min, max, step } = option;
  return (
    <div className="flex flex-col gap-1 px-1 mb-2.5">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {type === 'color' && (
        <ColorPicker value={value || def || '#3B82F6'} onChange={onChange} />
      )}
      {type === 'select' && options && (
        <VisualSelect options={options} value={value} onChange={onChange} />
      )}
      {type === 'text' && (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ''}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px] placeholder:text-slate-400" />
      )}
      {type === 'range' && (
        <div className="flex items-center gap-2">
          <input type="range" min={min || 0} max={max || 100} step={step || 1} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
          <span className="text-[10px] text-slate-500 w-8 text-right">{value}</span>
        </div>
      )}
    </div>
  );
}
