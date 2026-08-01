import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { TemplateDefinition } from '@/types/template';
import { getCategoryIcon, getCategoryGradient } from '../utils/templateUtils';

interface TemplateCardProps {
  template: TemplateDefinition;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export default function TemplateCard({
  template,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onContextMenu,
}: TemplateCardProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`
        relative border-2 rounded-xl p-4 cursor-pointer transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 hover:border-blue-400 hover:-translate-y-0.5'
        }
      `}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryGradient(template.category)} flex items-center justify-center text-2xl mb-3`}>
        {getCategoryIcon(template.category)}
      </div>

      {/* Name */}
      <div className="font-semibold text-sm text-slate-800 mb-1 truncate">
        {template.name}
      </div>

      {/* Category Badge */}
      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
        {template.category}
      </span>

      {/* Selection Checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Hover Actions */}
      {hover && !selected && onEdit && (
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            ✏️ 编辑
          </button>
          {onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="flex-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 rounded"
            >
              📋 复制
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              🗑️删除
            </button>
          )}
        </div>
      )}

      {/* Hover Description */}
      {hover && template.description && (
        <div className="absolute -bottom-12 left-0 right-0 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-10 line-clamp-2">
          {template.description}
        </div>
      )}
    </div>
  );
}
