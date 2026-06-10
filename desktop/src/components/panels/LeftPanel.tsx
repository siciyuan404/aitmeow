import { useState, useEffect } from 'react';
import { api, type Template, type TemplateOption } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

interface LeftPanelProps {
  selectedTemplate: Template | null;
  templateParams: Record<string, string>;
  onSelectTemplate: (t: Template | null) => void;
  onParamsChange: (p: Record<string, string>) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  brand: 'M12 2L2 7l10 5 10-5-10-5z',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  illustration: 'M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z',
  icon: 'M4 4h16v16H4V4z',
  infographic: 'M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z',
};

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

  useEffect(() => {
    if (!connected) return;
    api.listTemplates().then((d) => {
      setTemplates(d.templates);
      setCategories(d.categories);
      const all = new Set<string>();
      d.categories.forEach((c) => all.add(c));
      setExpanded(all);
    }).catch(() => {});
  }, [connected]);

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

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-3 flex flex-col shrink-0 overflow-y-auto">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
        Templates
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-1">
          <button
            onClick={() => toggleCat(cat)}
            className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium text-sm transition-colors"
          >
            <span className="flex items-center gap-2 capitalize">
              <svg className="w-[14px] h-[14px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
              {cat}
            </span>
            <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
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

      {selectedTemplate && selectedTemplate.options.length > 0 && (
        <div className="border-t border-slate-100 mt-2 pt-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Options
          </div>
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

      <div className="mt-auto pt-3">
        <button className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-slate-500 hover:text-blue-600 transition-all rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>New Template</span>
        </button>
      </div>
    </aside>
  );
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
  return (
    <div
      onClick={onSelect}
      className={`ml-3 p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all mb-1 ${
        selected
          ? 'border-blue-500 ring-1 ring-blue-500/10 bg-white shadow-md shadow-blue-500/5'
          : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm shadow-slate-50'
      }`}
    >
      {selected && (
        <div className="absolute right-2 top-2 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
          ✓
        </div>
      )}
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <div className="flex flex-col min-w-0 relative flex-1">
        <span className="text-xs font-semibold text-slate-800 truncate">{template.name}</span>
        {template.description && (
          <span className="text-[10px] text-slate-400 truncate">{template.description}</span>
        )}
      </div>
    </div>
  );
}

function OptionField({ option, value, onChange }: { option: TemplateOption; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1 px-1 mb-2">
      <label className="text-[11px] font-medium text-slate-500">{option.label}</label>
      {option.type === 'color' && (
        <div className="flex items-center border border-slate-200 rounded-lg p-1.5 gap-2 bg-slate-50/50">
          <span className="w-4 h-4 rounded shadow-sm shrink-0" style={{ backgroundColor: value || option.default }} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent font-mono text-slate-700 outline-none w-full text-[11px]"
          />
        </div>
      )}
      {option.type === 'select' && option.options && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px]"
        >
          {option.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      {option.type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={option.placeholder}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px]"
        />
      )}
      {option.type === 'range' && (
        <input
          type="range"
          min={option.min || 0}
          max={option.max || 100}
          step={option.step || 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
        />
      )}
    </div>
  );
}
