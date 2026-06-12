import { useState, useRef, useEffect } from 'react';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#64748B', '#6B7280', '#1F2937',
];

interface ColorPickerProps {
  value: string;
  onChange: (v: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const validColor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : PRESET_COLORS[10];

  return (
    <div className="relative" ref={panelRef}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center border border-slate-200 rounded-lg p-1.5 gap-2 bg-slate-50/50 cursor-pointer hover:border-slate-300 transition-colors"
      >
        <span className="w-5 h-5 rounded shadow-sm shrink-0 border border-slate-200" style={{ backgroundColor: validColor }} />
        <span className="font-mono text-[11px] text-slate-700">{value}</span>
        <svg className="w-3 h-3 text-slate-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-[208px]">
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                  value.toLowerCase() === c.toLowerCase()
                    ? 'border-blue-500 scale-110 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="border-t border-slate-100 mt-2 pt-2 flex items-center gap-2">
            <label className="text-[10px] text-slate-500 cursor-pointer flex items-center gap-1.5 hover:text-blue-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M3 12h18" />
              </svg>
              自定义
              <input
                type="color"
                value={validColor}
                onChange={(e) => { onChange(e.target.value); setOpen(false); }}
                className="absolute opacity-0 w-0 h-0"
              />
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setOpen(false)}
              className="flex-1 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-mono text-slate-700 outline-none focus:border-blue-400"
              placeholder="#000000"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
