import { useState, useMemo, useEffect, useRef } from 'react';
import type { TemplateDefinition } from '@/types/template';

interface TemplateQuickPickerProps {
  templates: TemplateDefinition[];
  value: string | null;
  onChange: (templateName: string) => void;
  onClose: () => void;
}

const categoryIcons: Record<string, string> = {
  brand: '🏷️',
  chart: '📊',
  illustration: '🎨',
  icon: '🔷',
  infographic: '📈',
};

const categoryGradients: Record<string, string> = {
  brand: 'from-purple-400 to-pink-400',
  chart: 'from-blue-400 to-cyan-400',
  illustration: 'from-green-400 to-emerald-400',
  icon: 'from-orange-400 to-amber-400',
  infographic: 'from-red-400 to-rose-400',
};

function getCategoryIcon(category: string): string {
  return categoryIcons[category] || '📄';
}

function getCategoryGradient(category: string): string {
  return categoryGradients[category] || 'from-slate-400 to-slate-500';
}

export default function TemplateQuickPicker({
  templates,
  value,
  onChange,
  onClose
}: TemplateQuickPickerProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return templates;
    const q = query.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [templates, query]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onChange(filtered[selectedIndex].name);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onChange, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-start justify-center pt-32 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          autoFocus
          placeholder="搜索模板... (支持名称、描述、分类)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 border-b border-slate-200 text-lg focus:outline-none"
        />
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-sm">未找到匹配的模板</div>
            </div>
          ) : (
            filtered.map((tmpl, idx) => (
              <button
                key={tmpl.name}
                onClick={() => {
                  onChange(tmpl.name);
                  onClose();
                }}
                className={`
                  w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors
                  ${idx === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
                `}
              >
                <div
                  className={`w-8 h-8 rounded bg-gradient-to-br ${getCategoryGradient(
                    tmpl.category
                  )} flex items-center justify-center text-sm`}
                >
                  {getCategoryIcon(tmpl.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">
                    {tmpl.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {tmpl.description} • {tmpl.category}
                  </div>
                </div>
                {tmpl.name === value && (
                  <div className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                    ✓
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>↑↓ 导航 • Enter 选择 • Esc 关闭</span>
          <span>{filtered.length} 个模板</span>
        </div>
      </div>
    </div>
  );
}
