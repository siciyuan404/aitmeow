import { useMemo } from 'react';
import type { TemplateOption } from '../../types/template';
import ColorPicker from '../ColorPicker';

interface TemplateFormProps {
  options: TemplateOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function TemplateForm({ options, values, onChange }: TemplateFormProps) {
  const getValue = (opt: TemplateOption) => values[opt.key] ?? opt.default;

  if (!options || options.length === 0) {
    return (
      <div className="p-4 text-center">
        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-slate-400">Select a template to configure its parameters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {options.map((opt) => (
        <div key={opt.key} className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-600">{opt.label}</label>
          {renderControl(opt, getValue(opt), (v) => onChange(opt.key, v))}
        </div>
      ))}
    </div>
  );
}

function renderControl(opt: TemplateOption, value: string, onChange: (v: string) => void) {
  switch (opt.type) {
    case 'color':
      return <ColorPicker value={value} onChange={onChange} />;

    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
        >
          {(opt.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );

    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opt.placeholder ?? ''}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
        />
      );

    case 'range':
      const min = opt.min ?? 1;
      const max = opt.max ?? 10;
      const step = opt.step ?? 1;
      const numVal = Number(value) || Number(opt.default) || min;
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 accent-blue-500"
          />
          <span className="text-xs font-mono text-slate-500 w-8 text-right">{numVal}</span>
        </div>
      );

    default:
      return <div className="text-sm text-slate-400">Unknown type: {(opt as any).type}</div>;
  }
}
