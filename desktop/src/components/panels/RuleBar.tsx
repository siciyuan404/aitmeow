const RULES = [
  { id: 'max_size', label: 'Max File Size', desc: '100KB limit', locked: true },
  { id: 'viewbox', label: 'Require ViewBox', desc: 'Must have viewBox', locked: false },
  { id: 'require_ids', label: 'Element IDs', desc: 'For click selection', locked: false },
  { id: 'color_palette', label: 'Color Palette', desc: 'Allowed colors only', locked: false },
  { id: 'no_inline_style', label: 'No Inline Styles', desc: 'Ban style attr', locked: false },
];

interface RuleBarProps {
  active: Set<string>;
  onToggle: (id: string) => void;
}

export default function RuleBar({ active, onToggle }: RuleBarProps) {
  return (
    <footer className="h-11 border-t border-slate-200 bg-white px-6 flex items-center gap-6 shrink-0 select-none overflow-x-auto">
      {RULES.map((rule) => {
        const on = active.has(rule.id);
        return (
          <label key={rule.id} className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
            <button
              onClick={() => !rule.locked && onToggle(rule.id)}
              disabled={rule.locked}
              className={`relative w-7 h-4 rounded-full transition-colors flex items-center px-0.5 disabled:opacity-60 ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${on ? 'translate-x-3' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[11px] font-medium transition-colors ${on ? 'text-slate-700' : 'text-slate-400'}`}>
              {rule.label}
            </span>
            <span className="text-[10px] text-slate-400 hidden lg:inline">{rule.desc}</span>
          </label>
        );
      })}
      <div className="flex-1" />
      <button className="text-slate-300 hover:text-slate-500 transition-colors shrink-0" title="About validation rules">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
      </button>
    </footer>
  );
}
