import { useState } from 'react';
import type { TemplateOption } from '@/types/template';

interface OptionEditorProps {
  options: TemplateOption[];
  onChange: (options: TemplateOption[]) => void;
}

export default function OptionEditor({ options, onChange }: OptionEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    if (window.confirm(`确定要删除参数 "${options[index].label}" 吗？`)) {
      onChange(options.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...options];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);

    // Update editing index if necessary
    if (editingIndex === fromIndex) {
      setEditingIndex(toIndex);
    } else if (editingIndex !== null) {
      if (fromIndex < editingIndex && toIndex >= editingIndex) {
        setEditingIndex(editingIndex - 1);
      } else if (fromIndex > editingIndex && toIndex <= editingIndex) {
        setEditingIndex(editingIndex + 1);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      moveOption(draggedIndex, dropIndex);
      setDraggedIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          参数选项 ({options.length})
        </label>
        <button
          type="button"
          onClick={addOption}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加参数
        </button>
      </div>

      {options.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="text-sm text-slate-400">暂无参数，点击上方按钮添加</p>
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`border rounded-lg transition-all ${
              draggedIndex === idx
                ? 'border-blue-400 bg-blue-50 opacity-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 p-3">
              {/* Drag Handle */}
              <button
                type="button"
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </button>

              {/* Option Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate">{opt.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{opt.key}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {getTypeLabel(opt.type)}
                  </span>
                </div>
                {editingIndex !== idx && opt.default && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    默认: {opt.default}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  title={editingIndex === idx ? '收起' : '编辑'}
                >
                  {editingIndex === idx ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded Edit Form */}
            {editingIndex === idx && (
              <div className="border-t border-slate-200 p-3 bg-slate-50/50">
                <OptionForm option={opt} onChange={(updated) => updateOption(idx, updated)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface OptionFormProps {
  option: TemplateOption;
  onChange: (opt: TemplateOption) => void;
}

function OptionForm({ option, onChange }: OptionFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Key */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            参数 Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={option.key}
            onChange={(e) => onChange({ ...option, key: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            placeholder="param_name"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={option.type}
            onChange={(e) => onChange({ ...option, type: e.target.value as TemplateOption['type'] })}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          >
            <option value="text">文本输入</option>
            <option value="color">颜色选择器</option>
            <option value="select">下拉选择</option>
            <option value="range">范围滑块</option>
          </select>
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          显示标签 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          placeholder="参数标签"
        />
      </div>

      {/* Default Value */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          默认值 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={option.default}
          onChange={(e) => onChange({ ...option, default: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          placeholder={getDefaultPlaceholder(option.type)}
        />
      </div>

      {/* Type-specific fields */}
      {option.type === 'text' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            占位符文本
          </label>
          <input
            type="text"
            value={option.placeholder || ''}
            onChange={(e) => onChange({ ...option, placeholder: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            placeholder="输入提示..."
          />
        </div>
      )}

      {option.type === 'select' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            选项列表 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={(option.options || []).join('\n')}
            onChange={(e) => onChange({ ...option, options: e.target.value.split('\n').filter(Boolean) })}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
            placeholder="每行一个选项..."
          />
          <p className="text-xs text-slate-500 mt-1">每行输入一个选项值</p>
        </div>
      )}

      {option.type === 'range' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">最小值</label>
            <input
              type="number"
              value={option.min ?? 1}
              onChange={(e) => onChange({ ...option, min: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">最大值</label>
            <input
              type="number"
              value={option.max ?? 10}
              onChange={(e) => onChange({ ...option, max: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">步长</label>
            <input
              type="number"
              value={option.step ?? 1}
              onChange={(e) => onChange({ ...option, step: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeLabel(type: TemplateOption['type']): string {
  const labels = {
    text: '文本',
    color: '颜色',
    select: '选择',
    range: '范围',
  };
  return labels[type] || type;
}

function getDefaultPlaceholder(type: TemplateOption['type']): string {
  const placeholders = {
    text: '输入默认文本...',
    color: '#000000',
    select: '第一个选项值',
    range: '5',
  };
  return placeholders[type] || '';
}
