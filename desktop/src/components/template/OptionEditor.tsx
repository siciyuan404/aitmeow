import { useState } from 'react';
import type { TemplateOption } from '@/types/template';

interface OptionEditorProps {
  options: TemplateOption[];
  onChange: (options: TemplateOption[]) => void;
}

export default function OptionEditor({ options, onChange }: OptionEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addOption = () => {
    const newOpt: TemplateOption = {
      type: 'text',
      key: `param_${options.length + 1}`,
      label: '新参数',
      default: '',
    };
    onChange([...options, newOpt]);
    setEditingIndex(options.length);
  };

  const updateOption = (index: number, updated: TemplateOption) => {
    const next = [...options];
    next[index] = updated;
    onChange(next);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          参数选项
        </label>
        <button
          type="button"
          onClick={addOption}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加参数
        </button>
      </div>

      {options.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          暂无参数，点击上方按钮添加
        </div>
      )}

      {options.map((opt, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{opt.label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                {editingIndex === idx ? '收起' : '编辑'}
              </button>
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                删除
              </button>
            </div>
          </div>

          {editingIndex === idx && (
            <OptionForm option={opt} onChange={(updated) => updateOption(idx, updated)} />
          )}
        </div>
      ))}
    </div>
  );
}

interface OptionFormProps {
  option: TemplateOption;
  onChange: (opt: TemplateOption) => void;
}

function OptionForm({ option, onChange }: OptionFormProps) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div>
        <label className="block text-xs text-slate-600 mb-1">参数 Key</label>
        <input
          type="text"
          value={option.key}
          onChange={(e) => onChange({ ...option, key: e.target.value })}
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">显示标签</label>
        <input
          type="text"
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">类型</label>
        <select
          value={option.type}
          onChange={(e) => onChange({ ...option, type: e.target.value as any })}
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
        >
          <option value="text">文本</option>
          <option value="color">颜色</option>
          <option value="select">下拉选择</option>
          <option value="range">范围滑块</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">默认值</label>
        <input
          type="text"
          value={option.default}
          onChange={(e) => onChange({ ...option, default: e.target.value })}
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
        />
      </div>
    </div>
  );
}
