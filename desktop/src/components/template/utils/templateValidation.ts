import type { TemplateDefinition, TemplateOption } from '@/types/template';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate template name
 */
export function validateTemplateName(
  name: string,
  existingNames: string[] = [],
  isEditing: boolean = false
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name || !name.trim()) {
    errors.push({ field: 'name', message: '模板名称不能为空' });
    return errors;
  }

  const trimmedName = name.trim();

  // Check format: lowercase letters, numbers, hyphens, underscores
  if (!/^[a-z0-9-_]+$/.test(trimmedName)) {
    errors.push({
      field: 'name',
      message: '仅支持小写字母、数字、连字符和下划线',
    });
  }

  // Check length
  if (trimmedName.length < 2) {
    errors.push({ field: 'name', message: '名称至少需要 2 个字符' });
  }

  if (trimmedName.length > 64) {
    errors.push({ field: 'name', message: '名称不能超过 64 个字符' });
  }

  // Check uniqueness (only for new templates)
  if (!isEditing && existingNames.includes(trimmedName)) {
    errors.push({ field: 'name', message: '模板名称已存在' });
  }

  return errors;
}

/**
 * Validate template description
 */
export function validateDescription(description: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!description || !description.trim()) {
    errors.push({ field: 'description', message: '描述不能为空' });
    return errors;
  }

  const trimmed = description.trim();

  if (trimmed.length < 3) {
    errors.push({ field: 'description', message: '描述至少需要 3 个字符' });
  }

  if (trimmed.length > 200) {
    errors.push({ field: 'description', message: '描述不能超过 200 个字符' });
  }

  return errors;
}

/**
 * Validate template category
 */
export function validateCategory(category: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!category || !category.trim()) {
    errors.push({ field: 'category', message: '请选择分类' });
  }

  return errors;
}

/**
 * Validate prompt template
 */
export function validatePromptTemplate(template: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!template || !template.trim()) {
    errors.push({ field: 'promptTemplate', message: '提示模板不能为空' });
    return errors;
  }

  const trimmed = template.trim();

  if (trimmed.length < 10) {
    errors.push({
      field: 'promptTemplate',
      message: '提示模板至少需要 10 个字符',
    });
  }

  if (trimmed.length > 10000) {
    errors.push({
      field: 'promptTemplate',
      message: '提示模板不能超过 10000 个字符',
    });
  }

  return errors;
}

/**
 * Extract variables from prompt template
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

/**
 * Validate template options/parameters
 */
export function validateOptions(options: TemplateOption[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!options || options.length === 0) {
    errors.push({ field: 'options', message: '至少需要定义一个参数' });
    return errors;
  }

  // Check for duplicate keys
  const keys = options.map((opt) => opt.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (duplicates.length > 0) {
    errors.push({
      field: 'options',
      message: `参数 key 重复: ${duplicates.join(', ')}`,
    });
  }

  // Validate each option
  options.forEach((opt, index) => {
    if (!opt.key || !opt.key.trim()) {
      errors.push({
        field: `options[${index}].key`,
        message: `参数 ${index + 1}: key 不能为空`,
      });
    }

    if (!opt.label || !opt.label.trim()) {
      errors.push({
        field: `options[${index}].label`,
        message: `参数 ${index + 1}: label 不能为空`,
      });
    }

    if (opt.default === undefined || opt.default === null) {
      errors.push({
        field: `options[${index}].default`,
        message: `参数 ${index + 1}: 默认值不能为空`,
      });
    }

    // Type-specific validation
    if ((opt.type === 'select' || opt.type === 'multiselect') && (!opt.options || opt.options.length === 0)) {
      errors.push({
        field: `options[${index}].options`,
        message: `参数 ${index + 1}: ${opt.type === 'multiselect' ? '多选' : '下拉选择'}必须定义选项列表`,
      });
    }

    if (opt.type === 'range') {
      if (opt.min === undefined || opt.max === undefined) {
        errors.push({
          field: `options[${index}].range`,
          message: `参数 ${index + 1}: 范围滑块必须定义 min 和 max`,
        });
      }

      if (opt.min !== undefined && opt.max !== undefined && opt.min >= opt.max) {
        errors.push({
          field: `options[${index}].range`,
          message: `参数 ${index + 1}: min 必须小于 max`,
        });
      }
    }
  });

  return errors;
}

/**
 * Check for undefined variables in prompt template
 */
export function checkUndefinedVariables(
  template: string,
  options: TemplateOption[]
): string[] {
  const variables = extractTemplateVariables(template);
  const definedKeys = options.map((opt) => opt.key);

  return variables.filter((v) => !definedKeys.includes(v));
}

/**
 * Validate complete template definition
 */
export function validateTemplate(
  template: Partial<TemplateDefinition>,
  existingNames: string[] = [],
  isEditing: boolean = false
): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Validate name
  if (template.name !== undefined) {
    allErrors.push(
      ...validateTemplateName(template.name, existingNames, isEditing)
    );
  } else {
    allErrors.push({ field: 'name', message: '模板名称不能为空' });
  }

  // Validate description
  if (template.description !== undefined) {
    allErrors.push(...validateDescription(template.description));
  } else {
    allErrors.push({ field: 'description', message: '描述不能为空' });
  }

  // Validate category
  if (template.category !== undefined) {
    allErrors.push(...validateCategory(template.category));
  } else {
    allErrors.push({ field: 'category', message: '请选择分类' });
  }

  // Validate prompt template
  if (template.prompt_template !== undefined) {
    allErrors.push(...validatePromptTemplate(template.prompt_template));
  } else {
    allErrors.push({ field: 'promptTemplate', message: '提示模板不能为空' });
  }

  // Validate options
  if (template.options !== undefined) {
    allErrors.push(...validateOptions(template.options));
  } else {
    allErrors.push({ field: 'options', message: '至少需要定义一个参数' });
  }

  // Check for undefined variables
  if (template.prompt_template && template.options) {
    const undefinedVars = checkUndefinedVariables(
      template.prompt_template,
      template.options
    );

    if (undefinedVars.length > 0) {
      allErrors.push({
        field: 'promptTemplate',
        message: `未定义的变量: ${undefinedVars.join(', ')}`,
      });
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Get user-friendly error messages by field
 */
export function getErrorsByField(
  errors: ValidationError[]
): Record<string, string[]> {
  const errorsByField: Record<string, string[]> = {};

  errors.forEach((error) => {
    if (!errorsByField[error.field]) {
      errorsByField[error.field] = [];
    }
    errorsByField[error.field].push(error.message);
  });

  return errorsByField;
}
