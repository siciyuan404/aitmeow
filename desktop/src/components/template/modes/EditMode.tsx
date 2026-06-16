import { useState, useEffect, useMemo } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import TemplateForm from '../TemplateForm';
import ParameterList from '../components/ParameterList';
import ExampleManager from '../components/ExampleManager';
import type { TemplateOption, TemplateExample } from '@/types/template';
import { validateTemplate } from '../utils/templateValidation';

export default function EditMode() {
  const templates = useTemplateStore((s) => s.templates);
  const editingTemplate = useTemplateStore((s) => s.editingTemplate);
  const setMode = useTemplateStore((s) => s.setMode);
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);
  const cancelEdit = useTemplateStore((s) => s.cancelEdit);

  const isEditing = !!editingTemplate;

  // Form state
  const [formValues, setFormValues] = useState({
    name: editingTemplate?.name || '',
    description: editingTemplate?.description || '',
    category: editingTemplate?.category || 'general',
    promptTemplate: editingTemplate?.prompt_template || '',
  });

  const [options, setOptions] = useState<TemplateOption[]>(
    editingTemplate?.options || []
  );

  const [examples, setExamples] = useState<TemplateExample[]>(
    editingTemplate?.examples || []
  );

  const [saving, setSaving] = useState(false);

  // Update form when editing template changes
  useEffect(() => {
    if (editingTemplate) {
      setFormValues({
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        promptTemplate: editingTemplate.prompt_template,
      });
      setOptions(editingTemplate.options);
      setExamples(editingTemplate.examples || []);
    }
  }, [editingTemplate]);

  // Get existing template names for validation
  const existingNames = useMemo(
    () => templates.map((t) => t.name),
    [templates]
  );

  // Validate template
  const validation = useMemo(() => {
    return validateTemplate(
      {
        name: formValues.name,
        description: formValues.description,
        category: formValues.category,
        prompt_template: formValues.promptTemplate,
        options,
      },
      existingNames,
      isEditing
    );
  }, [formValues, options, existingNames, isEditing]);

  // Handle field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!validation.valid) {
      alert('请修复表单中的错误');
      return;
    }

    setSaving(true);
    try {
      await saveTemplate({
        name: formValues.name,
        description: formValues.description,
        category: formValues.category,
        reference: editingTemplate?.reference || null,
        prompt_template: formValues.promptTemplate,
        options,
        validation: editingTemplate?.validation || { rules: [], retry_on_fail: 0 },
        examples,
      });
      // Navigate back to browse mode on success
      setMode('browse');
    } catch (error: any) {
      alert(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm('有未保存的更改，确定要离开吗？')) {
        cancelEdit();
        setMode('browse');
      }
    } else {
      cancelEdit();
      setMode('browse');
    }
  };

  // Check for unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!editingTemplate) {
      // New template - check if any fields are filled
      return (
        formValues.name !== '' ||
        formValues.description !== '' ||
        formValues.promptTemplate !== '' ||
        options.length > 0 ||
        examples.length > 0
      );
    }

    // Editing - check if anything changed
    return (
      formValues.name !== editingTemplate.name ||
      formValues.description !== editingTemplate.description ||
      formValues.category !== editingTemplate.category ||
      formValues.promptTemplate !== editingTemplate.prompt_template ||
      JSON.stringify(options) !== JSON.stringify(editingTemplate.options) ||
      JSON.stringify(examples) !== JSON.stringify(editingTemplate.examples || [])
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && validation.valid) {
          handleSave();
        }
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, validation.valid, formValues, options, examples]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600"
            title="返回"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {isEditing ? '编辑模板' : '创建模板'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing ? `编辑: ${editingTemplate.name}` : '创建新的 SVG 生成模板'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!validation.valid && (
            <span className="text-xs text-red-600 mr-2">
              {validation.errors.length} 个错误
            </span>
          )}
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!validation.valid || saving}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Basic Info Form */}
        <section>
          <h3 className="text-base font-semibold text-slate-800 mb-4">基本信息</h3>
          <TemplateForm
            values={formValues}
            onChange={handleFieldChange}
            isEditing={isEditing}
            existingNames={existingNames}
            definedVariables={options.map((opt) => opt.key)}
          />
        </section>

        {/* Parameters */}
        <section>
          <ParameterList options={options} onChange={setOptions} />
        </section>

        {/* Examples */}
        <section>
          <ExampleManager examples={examples} onChange={setExamples} />
        </section>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
        <p className="text-xs text-slate-500">
          快捷键: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">Ctrl+S</kbd> 保存，
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">Esc</kbd> 取消
        </p>
      </div>
    </div>
  );
}
