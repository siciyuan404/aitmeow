import { useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import type { TemplateDefinition, TemplateOption } from '@/types/template';
import ParameterList from './components/ParameterList';

interface TemplateEditorProps {
  template?: TemplateDefinition | null;
  onSave: (tmpl: TemplateDefinition) => Promise<void>;
  onCancel: () => void;
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'general');
  const [promptTemplate, setPromptTemplate] = useState(template?.prompt_template || '');
  const [options, setOptions] = useState<TemplateOption[]>(template?.options || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent | ReactMouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave({
        name,
        description,
        category,
        reference: template?.reference || null,
        prompt_template: promptTemplate,
        options,
        validation: template?.validation || { rules: [], retry_on_fail: 0 },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {template ? '编辑模板' : '创建模板'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              模板名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!!template}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="my-template"
            />
            <p className="text-xs text-slate-500 mt-1">
              仅支持字母、数字、连字符和下划线
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              描述 *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="简短描述这个模板"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              分类 *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="general">通用</option>
              <option value="brand">品牌</option>
              <option value="social">社交</option>
              <option value="illustration">插画</option>
              <option value="icon">图标</option>
            </select>
          </div>

          {/* Prompt Template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              提示模板 *
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              required
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="使用 {{variable}} 语法定义参数占位符"
            />
            <p className="text-xs text-slate-500 mt-1">
              使用 {`{{key}}`} 语法引用下方定义的参数
            </p>
          </div>

          {/* Parameters */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <ParameterList options={options} onChange={setOptions} />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
