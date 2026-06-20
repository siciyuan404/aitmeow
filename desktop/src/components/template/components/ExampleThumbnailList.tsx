import type { TemplateExample } from '@/types/template';

interface ExampleThumbnailListProps {
  examples: TemplateExample[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function ExampleThumbnailList({
  examples,
  activeIndex,
  onSelect
}: ExampleThumbnailListProps) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {examples.map((example, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`
            flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden transition-all
            ${idx === activeIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300 hover:border-blue-300'}
          `}
          title={example.description || `示例 ${idx + 1}`}
        >
          <div
            className="w-full h-full flex items-center justify-center scale-[0.25] origin-center"
            dangerouslySetInnerHTML={{ __html: example.svg_content }}
          />
        </button>
      ))}
    </div>
  );
}
