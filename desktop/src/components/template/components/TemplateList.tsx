import type { TemplateDefinition } from '@/types/template';
import { getCategoryIcon, getCategoryGradient } from '../utils/templateUtils';

interface TemplateListProps {
  templates: TemplateDefinition[];
  selectedIds?: string[];
  onSelect?: (template: TemplateDefinition) => void;
  onEdit?: (template: TemplateDefinition) => void;
  onDelete?: (template: TemplateDefinition) => void;
}

export default function TemplateList({
  templates,
  selectedIds = [],
  onSelect,
  onEdit,
  onDelete,
}: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm">暂无模板</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <div
          key={template.name}
          className={`
            flex items-center gap-4 p-3 border-2 rounded-lg cursor-pointer transition-all
            ${selectedIds.includes(template.name)
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-blue-400'
            }
          `}
          onClick={() => onSelect?.(template)}
        >
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryGradient(template.category)} flex items-center justify-center text-xl shrink-0`}>
            {getCategoryIcon(template.category)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-slate-800 truncate">{template.name}</div>
            <div className="text-xs text-slate-500 truncate">{template.description || '无描述'}</div>
          </div>

          {/* Category */}
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium shrink-0">
            {template.category}
          </span>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(template); }}
                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
              >
                编辑
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(template); }}
                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                删除
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
