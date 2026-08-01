import { useState } from 'react';
import type { TemplateOption } from '@/types/template';
import OptionEditor from '../OptionEditor';

interface ParameterListProps {
  options: TemplateOption[];
  onChange: (options: TemplateOption[]) => void;
}

export default function ParameterList({ options, onChange }: ParameterListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParamType, setNewParamType] = useState<TemplateOption['type']>('text');

  const handleAddParameter = () => {
    const newOption: TemplateOption = {
      type: newParamType,
      key: `param_${options.length + 1}`,
      label: '新参数',
      default: getDefaultValueForType(newParamType),
    };

    // Add type-specific defaults
    if (newParamType === 'select' || newParamType === 'multiselect') {
      newOption.options = ['选项1', '选项2', '选项3'];
    } else if (newParamType === 'range') {
      newOption.min = 1;
      newOption.max = 10;
      newOption.step = 1;
    } else if (newParamType === 'number') {
      newOption.step = 1;
    } else if (newParamType === 'textarea') {
      newOption.rows = 4;
    } else if (newParamType === 'color') {
      newOption.default = '#000000';
    }

    onChange([...options, newOption]);
    setShowAddForm(false);
    setNewParamType('text');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">参数配置</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            定义模板的可配置参数
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加参数
          </button>
        )}
      </div>

      {/* Add Parameter Form */}
      {showAddForm && (
        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">添加新参数</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              选择参数类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewParamType('text')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'text'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">文本</div>
                  <div className="text-xs opacity-75">单行文本输入</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('textarea')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'textarea'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">多行文本</div>
                  <div className="text-xs opacity-75">多行文本输入</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('number')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'number'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">数字</div>
                  <div className="text-xs opacity-75">数字输入框</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('range')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'range'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">范围</div>
                  <div className="text-xs opacity-75">滑块选择器</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('boolean')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'boolean'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">开关</div>
                  <div className="text-xs opacity-75">布尔值 true/false</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('color')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'color'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">颜色</div>
                  <div className="text-xs opacity-75">颜色选择器</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('select')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'select'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">单选</div>
                  <div className="text-xs opacity-75">下拉单选</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNewParamType('multiselect')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  newParamType === 'multiselect'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <div className="text-left">
                  <div className="text-sm font-medium">多选</div>
                  <div className="text-xs opacity-75">多选标签</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddParameter}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* Parameters List */}
      <OptionEditor options={options} onChange={onChange} showAddButton={false} />
    </div>
  );
}

function getDefaultValueForType(type: TemplateOption['type']): string {
  const defaults: Record<TemplateOption['type'], string> = {
    text: '',
    textarea: '',
    number: '0',
    range: '5',
    boolean: 'false',
    color: '#000000',
    select: '',
    multiselect: '',
  };
  return defaults[type] || '';
}
