import { useMemo } from 'react';

interface TemplateFormProps {
  values: {
    name: string;
    description: string;
    category: string;
    promptTemplate: string;
  };
  onChange: (field: string, value: string) => void;
  isEditing?: boolean;
  existingNames?: string[];
  definedVariables?: string[];
}

interface ValidationErrors {
  name?: string;
  description?: string;
  category?: string;
  promptTemplate?: string;
}

// Extract variables from template string
function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(new Set(Array.from(matches, m => m[1])));
}

// Compile prompt with variable substitution
function compilePrompt(template: string, definedVars: string[] = []): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const isDefined = definedVars.includes(varName);
    return isDefined ? `[${varName}]` : `<UNDEFINED:${varName}>`;
  });
}

// Validate form values
function validateForm(
  values: TemplateFormProps['values'],
  isEditing: boolean,
  existingNames: string[] = []
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name.trim()) {
    errors.name = '模板名称不能为空';
  } else if (!/^[a-z0-9-_]+$/.test(values.name)) {
    errors.name = '仅支持小写字母、数字、连字符和下划线';
  } else if (!isEditing && existingNames.includes(values.name)) {
    errors.name = '模板名称已存在';
  }

  // Description validation
  if (!values.description.trim()) {
    errors.description = '描述不能为空';
  } else if (values.description.trim().length < 3) {
    errors.description = '描述至少需要 3 个字符';
  }

  // Category validation
  if (!values.category) {
    errors.category = '请选择分类';
  }

  // Prompt template validation
  if (!values.promptTemplate.trim()) {
    errors.promptTemplate = '提示模板不能为空';
  } else if (values.promptTemplate.trim().length < 10) {
    errors.promptTemplate = '提示模板至少需要 10 个字符';
  }

  return errors;
}

export default function TemplateForm({
  values,
  onChange,
  isEditing = false,
  existingNames = [],
  definedVariables = [],
}: TemplateFormProps) {
  // Validation
  const errors = useMemo(
    () => validateForm(values, isEditing, existingNames),
    [values, isEditing, existingNames]
  );

  // Extract variables from prompt template
  const extractedVars = useMemo(
    () => extractVariables(values.promptTemplate),
    [values.promptTemplate]
  );

  // Compile prompt preview
  const compiledPrompt = useMemo(
    () => compilePrompt(values.promptTemplate, definedVariables),
    [values.promptTemplate, definedVariables]
  );

  // Identify undefined variables
  const undefinedVars = useMemo(
    () => extractedVars.filter(v => !definedVariables.includes(v)),
    [extractedVars, definedVariables]
  );

  return (
    <div className="flex gap-6">
      {/* Left Panel - Form Fields */}
      <div className="w-[400px] space-y-4">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            模板名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            disabled={isEditing}
            className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${
              errors.name
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                : 'border-slate-200 bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
            } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''} outline-none`}
            placeholder="my-template"
          />
          {errors.name ? (
            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">
              仅支持小写字母、数字、连字符和下划线
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            描述 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={values.description}
            onChange={(e) => onChange('description', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${
              errors.description
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                : 'border-slate-200 bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
            } outline-none`}
            placeholder="简短描述这个模板"
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            分类 <span className="text-red-500">*</span>
          </label>
          <select
            value={values.category}
            onChange={(e) => onChange('category', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${
              errors.category
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                : 'border-slate-200 bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
            } outline-none`}
          >
            <option value="">选择分类</option>
            <option value="general">通用</option>
            <option value="brand">品牌</option>
            <option value="social">社交</option>
            <option value="illustration">插画</option>
            <option value="icon">图标</option>
          </select>
          {errors.category && (
            <p className="text-xs text-red-600 mt-1">{errors.category}</p>
          )}
        </div>

        {/* Prompt Template */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            提示模板 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={values.promptTemplate}
            onChange={(e) => onChange('promptTemplate', e.target.value)}
            rows={8}
            className={`w-full border rounded-lg px-3 py-2 text-sm font-mono transition-colors resize-none ${
              errors.promptTemplate
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                : 'border-slate-200 bg-slate-50/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
            } outline-none`}
            placeholder="使用 {{variable}} 语法定义参数占位符"
          />
          {errors.promptTemplate ? (
            <p className="text-xs text-red-600 mt-1">{errors.promptTemplate}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">
              使用 {`{{key}}`} 语法引用参数
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-[300px] space-y-4">
        {/* Compiled Prompt Preview */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            编译后的提示词
          </h3>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 min-h-[200px]">
            {values.promptTemplate ? (
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                {compiledPrompt.split(/(<UNDEFINED:\w+>)/).map((part, i) => {
                  if (part.startsWith('<UNDEFINED:')) {
                    const varName = part.slice(11, -1);
                    return (
                      <span key={i} className="text-red-600 font-semibold bg-red-100 px-1 rounded">
                        {`{{${varName}}}`}
                      </span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </pre>
            ) : (
              <p className="text-xs text-slate-400 italic">
                输入提示模板以查看预览
              </p>
            )}
          </div>
        </div>

        {/* Detected Variables */}
        {extractedVars.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              检测到的变量
            </h3>
            <div className="space-y-1">
              {extractedVars.map((varName) => {
                const isDefined = definedVariables.includes(varName);
                return (
                  <div
                    key={varName}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                      isDefined
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isDefined ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="font-mono">{varName}</span>
                    {!isDefined && (
                      <span className="ml-auto text-[10px]">未定义</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Undefined Variables Warning */}
        {undefinedVars.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-800">
                  {undefinedVars.length} 个未定义的变量
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  这些变量在参数配置中未定义
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800">
                  {Object.keys(errors).length} 个验证错误
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  请修复左侧表单中的错误
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export validation function for external use
export { validateForm, extractVariables, compilePrompt };
