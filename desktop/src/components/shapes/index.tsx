import CircleIcon from './CircleIcon';
import HexagonIcon from './HexagonIcon';
import DiamondIcon from './DiamondIcon';
import SquareIcon from './SquareIcon';

const shapeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  circle: CircleIcon,
  hexagon: HexagonIcon,
  diamond: DiamondIcon,
  square: SquareIcon,
};

function getIconForValue(value: string) {
  const key = value.toLowerCase();
  return shapeIcons[key] || null;
}

const colorOptions = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'cyan',
  'rose', 'violet', 'lime', 'emerald', 'sky', 'amber', 'fuchsia', 'slate', 'gray', 'neutral'];

const colorHexes: Record<string, string> = {
  red: '#EF4444', orange: '#F97316', yellow: '#EAB308', green: '#22C55E',
  teal: '#14B8A6', blue: '#3B82F6', indigo: '#6366F1', purple: '#A855F7',
  pink: '#EC4899', cyan: '#06B6D4', rose: '#F43F5E', violet: '#8B5CF6',
  lime: '#84CC16', emerald: '#10B981', sky: '#0EA5E9', amber: '#F59E0B',
  fuchsia: '#D946EF', slate: '#64748B', gray: '#6B7280', neutral: '#737373',
};

function guessColorHex(val: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) return val;
  const lower = val.toLowerCase();
  if (colorHexes[lower]) return colorHexes[lower];
  const builtin: Record<string, string> = {
    warm: '#F97316', cool: '#06B6D4', monochrome: '#6B7280', vibrant: '#8B5CF6',
    modern: '#3B82F6', minimal: '#6B7280', bold: '#EF4444', gradient: '#8B5CF6',
    light: '#F3F4F6', dark: '#1F2937', white: '#FFFFFF', black: '#000000',
  };
  return builtin[lower] || null;
}

export { shapeIcons, getIconForValue, guessColorHex };

interface VisualSelectProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export default function VisualSelect({ options, value, onChange }: VisualSelectProps) {
  if (options.length <= 6) {
    return (
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const selected = value === opt;
          const Icon = getIconForValue(opt);
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px]">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
