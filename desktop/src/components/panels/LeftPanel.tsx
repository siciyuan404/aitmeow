import {
  useState,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { toast } from 'sonner';
import { api, type Template, type TemplateOption } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';
import { useTemplateStore } from '@/stores/templateStore';
import ColorPicker from '@/components/ColorPicker';
import VisualSelect, { getIconForValue } from '@/components/shapes';
import TemplateEditor from '@/components/template/TemplateEditor';

interface LeftPanelProps {
  selectedTemplate: Template | null;
  templateParams: Record<string, string>;
  onSelectTemplate: (t: Template | null) => void;
  onParamsChange: (p: Record<string, string>) => void;
}

export default function LeftPanel({
  selectedTemplate,
  templateParams,
  onSelectTemplate,
  onParamsChange,
}: LeftPanelProps) {
  const { connected } = useConnectionStore();
  const { createTemplate, updateTemplate, deleteTemplate } = useTemplateStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [referenceSvg, setReferenceSvg] = useState<{ id: string; name: string; svg_content: string } | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [optionsHeight, setOptionsHeight] = useState(280);
  const [templateMenu, setTemplateMenu] = useState<{ x: number; y: number; template?: Template } | null>(null);

  useEffect(() => {
    if (!connected) return;
    api.listTemplates().then((d) => {
      setTemplates(d.templates);
      setCategories(d.categories);
      setActiveCategory((current) => (current && d.categories.includes(current) ? current : null));
      if (d.templates.length === 0) {
        onSelectTemplate(null);
        onParamsChange({});
      }
    }).catch((err: Error) => toast.error('加载模板失败: ' + err.message));
  }, [connected, onSelectTemplate, onParamsChange]);

  useEffect(() => {
    if (!connected) return;
    api.sessionState().then((s) => {
      if ((s as any).reference_svg) {
        setReferenceSvg((s as any).reference_svg);
      }
    }).catch((err: Error) => toast.error('获取会话状态失败: ' + err.message));
  }, [connected, selectedTemplate]);

  const byCategory = new Map<string, Template[]>();
  templates.forEach((t) => {
    const c = t.category || 'general';
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(t);
  });

  const handleParamChange = (key: string, value: string) => {
    onParamsChange({ ...templateParams, [key]: value });
  };

  const handleClearReference = async () => {
    try {
      await api.setReferenceSvg(null);
      setReferenceSvg(null);
    } catch (err: any) { toast.error('清除参考图失败: ' + (err.message || err)); }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setShowEditor(true);
  };

  const handleSaveTemplate = async (tmpl: Template) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.name, tmpl);
        toast.success('模板已更新');
        // Refresh local templates list
        const res = await api.listTemplates();
        setTemplates(res.templates);
        setCategories(res.categories);
        setActiveCategory((current) => (current && res.categories.includes(current) ? current : null));
        if (selectedTemplate?.name === editingTemplate.name) {
          const refreshed = res.templates.find((item) => item.name === tmpl.name) || null;
          onSelectTemplate(refreshed);
        }
      } else {
        await createTemplate(tmpl);
        toast.success('模板已创建');
        // Refresh local templates list
        const res = await api.listTemplates();
        setTemplates(res.templates);
        setCategories(res.categories);
      }
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (err: any) {
      toast.error(err.message || '保存失败');
      throw err;
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    setTemplateMenu(null);
    if (!confirm(`确定要删除模板 "${name}" 吗？`)) return;
    try {
      await deleteTemplate(name);
      toast.success('模板已删除');
      // Refresh local templates list
      const res = await api.listTemplates();
      setTemplates(res.templates);
      setCategories(res.categories);
      setActiveCategory((current) => (current && res.categories.includes(current) ? current : null));
      if (selectedTemplate?.name === name) {
        onSelectTemplate(null);
        onParamsChange({});
      }
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  const catLabel: Record<string, string> = {
    brand: '品牌标志',
    chart: '数据图表',
    illustration: '插画',
    icon: '图标',
    infographic: '信息图',
  };

  const visibleTemplates = activeCategory
    ? byCategory.get(activeCategory) || []
    : templates;

  const handleTemplateContextMenu = (tmpl: Template, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setTemplateMenu({
      x: Math.min(event.clientX, window.innerWidth - 168),
      y: Math.min(event.clientY, window.innerHeight - 56),
      template: tmpl,
    });
  };

  const handlePanelContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setTemplateMenu({
      x: Math.min(event.clientX, window.innerWidth - 168),
      y: Math.min(event.clientY, window.innerHeight - 56),
    });
  };

  const handleOptionsResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = optionsHeight;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight - (moveEvent.clientY - startY);
      setOptionsHeight(Math.min(420, Math.max(180, nextHeight)));
    };

    const handlePointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
      {/* fixed header */}
      <div
        className="p-3 pb-0 shrink-0 flex items-center justify-between"
        onContextMenu={handlePanelContextMenu}
      >
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          模板
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3" onContextMenu={handlePanelContextMenu}>
        {connected && categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <CategoryChip
              label="全部"
              count={templates.length}
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                label={catLabel[cat] || cat}
                count={byCategory.get(cat)?.length || 0}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        )}

        {connected && visibleTemplates.length > 0 && (
          <div className="space-y-1">
            {visibleTemplates.map((tmpl) => (
              <TemplateCard
                key={tmpl.name}
                template={tmpl}
                selected={selectedTemplate?.name === tmpl.name}
                onSelect={() => onSelectTemplate(tmpl)}
                onContextMenu={(event) => handleTemplateContextMenu(tmpl, event)}
              />
            ))}
          </div>
        )}

        {connected && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">暂无模板</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">模板功能待重构，当前模板列表已清空。</p>
          </div>
        )}

        {connected && templates.length > 0 && visibleTemplates.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">当前分类暂无模板</p>
        )}

        {!connected && (
          <p className="text-slate-500 text-xs text-center py-8">连接服务端以加载模板</p>
        )}
      </div>

      {/* reference svg indicator */}
      {referenceSvg && (
        <div className="shrink-0 mx-3 mb-1 p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center overflow-hidden rounded bg-white border border-slate-200 shrink-0">
            <div className="w-full h-full flex items-center justify-center scale-[0.25]" dangerouslySetInnerHTML={{ __html: referenceSvg.svg_content }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-slate-700 truncate">{referenceSvg.name}</div>
            <div className="text-[9px] text-amber-600">参考图已设置</div>
          </div>
          <button onClick={handleClearReference} className="text-slate-400 hover:text-red-500 transition-colors" title="清除参考">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {selectedTemplate && (
        <div
          role="separator"
          aria-orientation="horizontal"
          title="拖拽调整选项区域高度"
          onPointerDown={handleOptionsResizeStart}
          className="group relative h-2 shrink-0 cursor-row-resize border-t border-slate-200 bg-white transition-colors hover:bg-blue-50"
        >
          <div className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}

      {selectedTemplate && (
        <div
          className="flex min-h-0 shrink-0 flex-col bg-slate-50 px-3 pb-3 pt-2"
          style={{ height: optionsHeight }}
        >
          <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">选项</div>
              <div className="mt-1 truncate text-xs font-semibold text-slate-800">
                {selectedTemplate.description || selectedTemplate.name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPromptPreview(true)}
              className="shrink-0 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-50"
            >
              查看提示词
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white px-2 py-2">
            {selectedTemplate.options.length > 0 ? (
              selectedTemplate.options.map((opt) => (
                <OptionField
                  key={opt.key}
                  option={opt}
                  value={templateParams[opt.key] || opt.default || ''}
                  onChange={(v) => handleParamChange(opt.key, v)}
                />
              ))
            ) : (
              <p className="px-1 py-2 text-xs text-slate-500">该模板没有可配置选项。</p>
            )}
          </div>
        </div>
      )}

      {selectedTemplate && showPromptPreview && (
        <PromptPreviewDialog
          prompt={compilePrompt(selectedTemplate, templateParams)}
          onClose={() => setShowPromptPreview(false)}
        />
      )}

      {templateMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTemplateMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setTemplateMenu(null);
            }}
          />
          <div
            className="fixed z-50 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
            style={{ left: templateMenu.x, top: templateMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setTemplateMenu(null);
                handleCreateTemplate();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              添加模板
            </button>
            {templateMenu.template && (
              <>
                <div className="my-1 h-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => {
                    const tmpl = templateMenu.template!;
                    setTemplateMenu(null);
                    handleEditTemplate(tmpl);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  编辑模板
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(templateMenu.template!.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                  删除模板
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </aside>
  );
}

function compilePrompt(tmpl: Template, params: Record<string, string>): string {
  if (!tmpl.prompt_template) return '(无提示词模板)';
  let result = tmpl.prompt_template;
  for (const opt of tmpl.options) {
    const val = params[opt.key] || opt.default || '';
    result = result.split(`{{${opt.key}}}`).join(val);
  }
  if (result.includes('{{')) {
    result = result.replace(/\{\{.+?\}\}/g, '___');
  }
  return result;
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      <span className="max-w-[92px] truncate">{label}</span>
      <span className={active ? 'text-blue-600' : 'text-slate-400'}>
        {count}
      </span>
    </button>
  );
}

function PromptPreviewDialog({
  prompt,
  onClose,
}: {
  prompt: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-preview-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[min(560px,calc(100vh-48px))] w-[min(560px,calc(100vw-48px))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <h3 id="prompt-preview-title" className="text-sm font-semibold text-slate-900">Agent 提示词预览</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="关闭"
            aria-label="关闭提示词预览"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-violet-50/30 p-4">
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-violet-200/70 bg-white p-3 text-xs leading-6 text-slate-700">
            {prompt}
          </pre>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onContextMenu,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const Icon = getIconForValue(template.name);
  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all relative ${
        selected
          ? 'border-blue-500 ring-1 ring-inset ring-blue-500 bg-white'
          : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm shadow-slate-50'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        {Icon ? (
          <Icon className="w-4 h-4" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-slate-800 truncate">{template.description || template.name}</span>
        {template.description && template.description !== template.name && (
          <span className="text-[10px] text-slate-500 truncate">{template.name}</span>
        )}
      </div>
    </div>
  );
}

function OptionField({ option, value, onChange }: { option: TemplateOption; value: string; onChange: (v: string) => void }) {
  const { label, type, placeholder, options, default: def, min, max, step, rows } = option;

  // multiselect: value 是逗号分隔的字符串，转为 Set 便于勾选
  const multiValues = type === 'multiselect' ? new Set((value || '').split(',').map(s => s.trim()).filter(Boolean)) : null;

  const toggleMulti = (item: string) => {
    if (!multiValues) return;
    const next = new Set(multiValues);
    if (next.has(item)) next.delete(item); else next.add(item);
    onChange(Array.from(next).join(','));
  };

  return (
    <div className="flex flex-col gap-1 px-1 mb-2.5">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {type === 'color' && (
        <ColorPicker value={value || def || '#3B82F6'} onChange={onChange} />
      )}
      {type === 'select' && options && (
        <VisualSelect options={options} value={value} onChange={onChange} />
      )}
      {type === 'text' && (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ''}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px] placeholder:text-slate-400" />
      )}
      {type === 'textarea' && (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ''} rows={rows || 4}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px] placeholder:text-slate-400 resize-none" />
      )}
      {type === 'number' && (
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
          min={min} max={max} step={step || 1} placeholder={placeholder || ''}
          className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-slate-700 outline-none text-[11px] placeholder:text-slate-400" />
      )}
      {type === 'range' && (
        <div className="flex items-center gap-2">
          <input type="range" min={min || 0} max={max || 100} step={step || 1} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
          <span className="text-[10px] text-slate-500 w-8 text-right">{value}</span>
        </div>
      )}
      {type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-[11px] text-slate-600">{value === 'true' ? '是' : '否'}</span>
        </label>
      )}
      {type === 'multiselect' && options && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleMulti(item)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                multiValues?.has(item)
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
