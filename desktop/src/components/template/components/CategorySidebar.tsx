import { useTemplateStore } from '@/stores/templateStore';
import { getCategoryLabel } from '../utils/templateUtils';

export default function CategorySidebar() {
  const templates = useTemplateStore(s => s.templates);
  const categories = useTemplateStore(s => s.categories);
  const categoryFilter = useTemplateStore(s => s.categoryFilter);
  const setCategoryFilter = useTemplateStore(s => s.setCategoryFilter);

  // 计算每个分类的模板数量
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = templates.length;

  return (
    <div className="w-32 border-r border-slate-200 shrink-0">
      <div className="p-2 space-y-1">
        {/* 全部 */}
        <button
          onClick={() => setCategoryFilter(null)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
            ${categoryFilter === null
              ? 'bg-blue-500 text-white font-semibold'
              : 'text-slate-700 hover:bg-slate-100'
            }
          `}
        >
          <span>全部</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryFilter === null ? 'bg-blue-600' : 'bg-slate-200'}`}>
            {totalCount}
          </span>
        </button>

        {/* 分类列表 */}
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`
              w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
              ${categoryFilter === cat
                ? 'bg-blue-500 text-white font-semibold'
                : 'text-slate-700 hover:bg-slate-100'
              }
            `}
          >
            <span className="truncate">{getCategoryLabel(cat)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${categoryFilter === cat ? 'bg-blue-600' : 'bg-slate-200'}`}>
              {categoryCounts[cat] || 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
