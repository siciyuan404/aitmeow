import { useState, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import TemplateSearch from '../components/TemplateSearch';
import CategorySidebar from '../components/CategorySidebar';
import TemplateGrid from '../components/TemplateGrid';
import TemplateList from '../components/TemplateList';
import TemplateContextMenu from '../components/TemplateContextMenu';
import type { TemplateDefinition } from '@/types/template';
import { toast } from 'sonner';

export default function BrowseMode() {
  const templates = useTemplateStore(s => s.templates);
  const viewMode = useTemplateStore(s => s.viewMode);
  const setViewMode = useTemplateStore(s => s.setViewMode);
  const searchQuery = useTemplateStore(s => s.searchQuery);
  const categoryFilter = useTemplateStore(s => s.categoryFilter);
  const sortBy = useTemplateStore(s => s.sortBy);
  const setSortBy = useTemplateStore(s => s.setSortBy);
  const startEdit = useTemplateStore(s => s.startEdit);
  const deleteTemplate = useTemplateStore(s => s.deleteTemplate);

  const [contextMenu, setContextMenu] = useState<{
    template: TemplateDefinition;
    x: number;
    y: number;
  } | null>(null);

  // 过滤和排序模板
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // 搜索过滤
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // 分类过滤
    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // 排序
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return sorted;
  }, [templates, searchQuery, categoryFilter, sortBy]);

  const handleContextMenu = (e: ReactMouseEvent, template: TemplateDefinition) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ template, x: e.clientX, y: e.clientY });
  };

  const handleEdit = (template: TemplateDefinition) => {
    setContextMenu(null);
    startEdit(template);
  };

  const handleDelete = async (template: TemplateDefinition) => {
    setContextMenu(null);
    if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) return;

    try {
      await deleteTemplate(template.name);
      toast.success('模板已删除');
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        {/* 搜索栏 */}
        <TemplateSearch />

        {/* 视图和排序 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⊞ 网格
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ☰ 列表
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="category">分类</option>
          </select>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 分类边栏 */}
        <CategorySidebar />

        {/* 模板列表 */}
        <div className="flex-1 p-4 overflow-y-auto" onContextMenu={(e) => e.preventDefault()}>
          {viewMode === 'grid' ? (
            <TemplateGrid
              templates={filteredTemplates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <TemplateList
              templates={filteredTemplates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <TemplateContextMenu
          template={contextMenu.template}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => handleEdit(contextMenu.template)}
          onDelete={() => handleDelete(contextMenu.template)}
        />
      )}
    </div>
  );
}
