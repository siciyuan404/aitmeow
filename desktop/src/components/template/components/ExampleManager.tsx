import { useState } from 'react';
import type { TemplateExample } from '@/types/template';

interface ExampleManagerProps {
  examples: TemplateExample[];
  onChange: (examples: TemplateExample[]) => void;
}

export default function ExampleManager({ examples, onChange }: ExampleManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newExample, setNewExample] = useState<Partial<TemplateExample>>({
    svg_content: '',
    description: '',
  });

  const handleAddExample = () => {
    if (!newExample.svg_content?.trim()) {
      alert('请粘贴 SVG 内容');
      return;
    }

    const example: TemplateExample = {
      svg_content: newExample.svg_content.trim(),
      description: newExample.description?.trim() || '',
      params: {},
    };

    onChange([...examples, example]);
    setNewExample({ svg_content: '', description: '' });
    setShowAddDialog(false);
  };

  const handleRemoveExample = (index: number) => {
    if (window.confirm('确定要删除此示例吗？')) {
      onChange(examples.filter((_, i) => i !== index));
    }
  };

  const getThumbnail = (svg: string): string => {
    // Return data URL for SVG thumbnail
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">示例管理</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            添加模板生成的示例 SVG
          </p>
        </div>
        {!showAddDialog && (
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加示例
          </button>
        )}
      </div>

      {/* Add Example Dialog */}
      {showAddDialog && (
        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">添加新示例</h4>
            <button
              type="button"
              onClick={() => {
                setShowAddDialog(false);
                setNewExample({ svg_content: '', description: '' });
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              SVG 内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newExample.svg_content || ''}
              onChange={(e) => setNewExample({ ...newExample, svg_content: e.target.value })}
              rows={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
              placeholder="粘贴完整的 SVG 代码..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              描述（可选）
            </label>
            <input
              type="text"
              value={newExample.description || ''}
              onChange={(e) => setNewExample({ ...newExample, description: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              placeholder="简短描述此示例..."
            />
          </div>

          {/* Preview */}
          {newExample.svg_content && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                预览
              </label>
              <div className="border border-slate-200 rounded-lg p-4 bg-white flex items-center justify-center">
                <img
                  src={getThumbnail(newExample.svg_content)}
                  alt="Preview"
                  className="max-w-full max-h-[200px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddDialog(false);
                setNewExample({ svg_content: '', description: '' });
              }}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddExample}
              disabled={!newExample.svg_content?.trim()}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* Examples Grid */}
      {examples.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-slate-400">暂无示例</p>
          <p className="text-xs text-slate-400 mt-1">点击上方按钮添加示例</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {examples.map((example, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-slate-300 transition-colors"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center p-4 border-b border-slate-200">
                <img
                  src={getThumbnail(example.svg_content)}
                  alt={example.description || `示例 ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '';
                    target.alt = 'Invalid SVG';
                  }}
                />
              </div>

              {/* Info */}
              <div className="p-3">
                {example.description ? (
                  <p className="text-xs text-slate-700 mb-2 line-clamp-2">
                    {example.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mb-2 italic">
                    无描述
                  </p>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveExample(index)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
