import { useMemo } from 'react';
import type { TemplateDefinition } from '@/types/template';

interface PromptPreviewProps {
  template: TemplateDefinition;
  params: Record<string, string>;
}

export default function PromptPreview({ template, params }: PromptPreviewProps) {
  const compiledPrompt = useMemo(() => {
    let result = template.prompt_template;
    template.options.forEach((opt) => {
      const value = params[opt.key] || opt.default || '';
      result = result.replace(new RegExp(`{{${opt.key}}}`, 'g'), value);
    });
    return result;
  }, [template, params]);

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">编译后提示词</div>
      <textarea
        value={compiledPrompt}
        readOnly
        className="w-full h-32 px-3 py-2 border-2 border-violet-200 bg-violet-50/50 rounded-lg text-sm font-mono resize-none focus:outline-none focus:border-violet-300"
        placeholder="提示词预览将显示在这里..."
      />
      <div className="mt-2 text-xs text-slate-500">
        只读预览 • 可复制此提示词
      </div>
    </div>
  );
}
