import type { TemplateDefinition } from '@/types/template';
import TemplateCard from './TemplateCard';

interface TemplateGridProps {
  templates: TemplateDefinition[];
  selectedIds?: string[];
  onSelect?: (template: TemplateDefinition) => void;
  onEdit?: (template: TemplateDefinition) => void;
  onDelete?: (template: TemplateDefinition) => void;
  onCopy?: (template: TemplateDefinition) => void;
}

export default function TemplateGrid({
  templates,
  selectedIds = [],
  onSelect,
  onEdit,
  onDelete,
  onCopy,
}: TemplateGridProps) {
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
    <div className="grid grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.name}
          template={template}
          selected={selectedIds.includes(template.name)}
          onSelect={() => onSelect?.(template)}
          onEdit={() => onEdit?.(template)}
          onDelete={() => onDelete?.(template)}
          onCopy={() => onCopy?.(template)}
        />
      ))}
    </div>
  );
}
