import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api, type SvgRecord } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

interface RightPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function RightPanel({ selectedId, onSelect }: RightPanelProps) {
  const { connected } = useConnectionStore();
  const [items, setItems] = useState<SvgRecord[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perPage = 12;

  const fetchItems = useCallback(async () => {
    if (!connected) return;
    try {
      const data = await api.listSvgs({ offset: page * perPage, limit: perPage });
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) { toast.error('加载素材列表失败: ' + (err.message || err)); }
  }, [connected, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!search.trim()) { fetchItems(); return; }
    api.searchSvgs(search).then(setItems).catch((err: Error) => toast.error('搜索失败: ' + err.message));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleUseReference = async (item: SvgRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const full = await api.getSvg(item.id);
      await api.setReferenceSvg({ id: full.id, name: full.name, svg_content: full.svg_content });
      toast.success('已设为参考图: ' + full.name);
    } catch (err: any) { toast.error('设置参考图失败: ' + (err.message || err)); }
  };

  return (
    <aside className="w-[340px] border-l border-slate-200 bg-white p-3 flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 gap-2 focus-within:border-blue-400 transition-colors">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索素材..."
            className="bg-transparent text-xs text-slate-700 outline-none w-full placeholder:text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 gap-2 auto-rows-max content-start">
        {items.map((item) => {
          const selected = selectedId === item.id;
          return (
            <div key={item.id} onClick={() => onSelect(selected ? null : item.id)}
              className={`relative border p-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                selected ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm shadow-slate-50'
              }`}>
              {/* reference button on hover */}
              <button
                onClick={(e) => handleUseReference(item, e)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100"
                title="作为参考图"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full flex items-center justify-center scale-[0.35]" dangerouslySetInnerHTML={{ __html: item.svg_content }} />
              </div>
              <div className="text-[10px] font-medium text-slate-700 truncate w-full text-center leading-tight">{item.name}</div>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {(item.tags || []).slice(0, 2).map((t) => (
                  <span key={t} className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-medium">{t}</span>
                ))}
              </div>
            </div>
          );
        })}
        {!connected && (
          <div className="col-span-3 text-center text-slate-500 text-xs py-8">连接服务端以加载素材</div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600 shrink-0 mt-2">
        <span className="text-[10px]">共 {total} 项</span>
        <div className="flex gap-0.5">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-[9px] hover:bg-slate-50 disabled:opacity-30 text-slate-600">‹</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium ${
                page === i ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}>{i + 1}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-[9px] hover:bg-slate-50 disabled:opacity-30 text-slate-600">›</button>
        </div>
      </div>
    </aside>
  );
}
