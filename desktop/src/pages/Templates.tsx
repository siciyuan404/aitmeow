import { useState, useEffect } from 'react';
import { api, type Template } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

export default function TemplatesPage() {
  const { connected } = useConnectionStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Template | null>(null);

  useEffect(() => {
    if (!connected) return;
    api.listTemplates().then((data) => {
      setTemplates(data.templates);
      setCategories(data.categories);
    }).catch(() => {});
  }, [connected]);

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  return (
    <div className="flex h-full gap-4 min-h-0">
      <div className={`space-y-4 min-w-0 ${selected ? 'lg:w-3/5 w-full' : 'w-full'}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">{templates.length} templates available</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              activeCategory === 'All' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors capitalize ${
                activeCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {!connected && (
          <p className="text-gray-600 text-sm py-8 text-center">Connect to server to load templates</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tmpl) => (
            <div
              key={tmpl.name}
              onClick={() => setSelected(tmpl)}
              className={`bg-gray-900 rounded-lg border p-4 cursor-pointer transition-colors hover:border-purple-700 ${
                selected?.name === tmpl.name ? 'border-purple-500' : 'border-gray-800'
              }`}
            >
              <h3 className="text-sm font-medium text-gray-200">{tmpl.name}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded capitalize">
                  {tmpl.category}
                </span>
                <span className="text-[10px] text-gray-600">
                  {tmpl.options.length} options
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="hidden lg:flex lg:w-2/5 flex-col bg-gray-900 rounded-lg border border-gray-800 min-h-0">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-300">{selected.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {selected.options.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Options</h3>
                <div className="space-y-2">
                  {selected.options.map((opt) => (
                    <div key={opt.key} className="bg-gray-800 rounded p-2 flex items-center justify-between">
                      <span className="text-xs text-gray-300">{opt.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                          {opt.type}
                        </span>
                        {opt.default && (
                          <span className="text-[10px] text-gray-500">
                            default: {opt.default}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.reference && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Reference</h3>
                <div className="bg-gray-800 rounded p-3 flex items-center justify-center">
                  <div
                    className="max-w-full max-h-32"
                    dangerouslySetInnerHTML={{ __html: selected.reference }}
                  />
                </div>
              </div>
            )}

            {selected.prompt_template && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Prompt</h3>
                <pre className="bg-gray-800 rounded p-3 text-[11px] text-gray-300 font-mono whitespace-pre-wrap">
                  {selected.prompt_template}
                </pre>
              </div>
            )}

            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Validation</h3>
              <div className="space-y-1">
                {selected.validation?.rules.map((r) => (
                  <div key={r} className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1 font-mono">{r}</div>
                ))}
                {selected.validation?.retry_on_fail > 0 && (
                  <p className="text-xs text-gray-500">Retry on fail: {selected.validation.retry_on_fail}x</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
