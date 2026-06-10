import { useState, useEffect, useCallback } from 'react';
import { api, type SvgRecord } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

export default function RepositoryPage() {
  const { connected } = useConnectionStore();
  const [items, setItems] = useState<SvgRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SvgRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      if (search) {
        const results = await api.searchSvgs(search);
        setItems(results);
        setTotal(results.length);
      } else {
        const data = await api.listSvgs({ limit: 50 });
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      // server may not be running
    } finally {
      setLoading(false);
    }
  }, [connected, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSvg(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // ignore
    }
  };

  const panelSvg = selected?.svg_content || '';

  return (
    <div className="flex h-full gap-4 min-h-0">
      <div className={`space-y-4 min-w-0 ${selected ? 'lg:w-3/5 w-full' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Repository</h1>
            <p className="text-sm text-gray-500">{total} SVGs</p>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className={`bg-gray-900 rounded-lg border p-3 cursor-pointer transition-colors hover:border-purple-700 ${
                selected?.id === item.id ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-800'
              }`}
            >
              <div className="aspect-square bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                <div
                  className="w-full h-full flex items-center justify-center p-2 scale-75"
                  dangerouslySetInnerHTML={{ __html: item.svg_content }}
                />
              </div>
              <p className="text-xs text-gray-300 truncate">{item.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(item.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] px-1 py-0.5 bg-purple-900/40 text-purple-300 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!loading && items.length === 0 && (
          <p className="text-center text-gray-600 py-12">
            {connected ? 'No SVGs yet. Use the Preview page to save.' : 'Connect to server first'}
          </p>
        )}
      </div>

      {selected && (
        <div className="hidden lg:flex lg:w-2/5 flex-col bg-gray-900 rounded-lg border border-gray-800 min-h-0">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-300 truncate">{selected.name}</h2>
            <button
              onClick={() => { handleDelete(selected.id); }}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
            >
              Delete
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="bg-gray-800 rounded flex items-center justify-center p-4">
              <div
                className="max-w-full max-h-48"
                dangerouslySetInnerHTML={{ __html: panelSvg }}
              />
            </div>
            {selected.template_name && (
              <p className="text-xs text-gray-500">Template: {selected.template_name}</p>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.tags.map((t) => (
                  <span key={t} className="text-[11px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{t}</span>
                ))}
              </div>
            )}
            <pre className="bg-gray-800 rounded p-3 text-[11px] text-gray-300 font-mono overflow-auto max-h-60 whitespace-pre-wrap">
              {panelSvg}
            </pre>
            <p className="text-[11px] text-gray-600">
              Created: {new Date(selected.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
