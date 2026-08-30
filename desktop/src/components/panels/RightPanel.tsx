import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api, type SvgRecord, type CollectionSummary } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

interface RightPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

type Tab = 'library' | 'collections';

export default function RightPanel({ selectedId, onSelect }: RightPanelProps) {
  const { connected } = useConnectionStore();
  const [tab, setTab] = useState<Tab>('library');
  const [items, setItems] = useState<SvgRecord[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perPage = 12;

  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collItems, setCollItems] = useState<SvgRecord[]>([]);

  const fetchItems = useCallback(async () => {
    if (!connected) return;
    try {
      const data = await api.listSvgs({ offset: page * perPage, limit: perPage, record_type: 'result' });
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) { toast.error('加载素材列表失败: ' + (err.message || err)); }
  }, [connected, page]);

  const fetchCollections = useCallback(async () => {
    if (!connected) return;
    try {
      const list = await api.listCollections();
      setCollections(list);
    } catch (err: any) { toast.error('加载集合失败: ' + (err.message || err)); }
  }, [connected]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (tab === 'collections') fetchCollections();
  }, [tab, fetchCollections]);

  useEffect(() => {
    if (search.trim()) {
      api.searchSvgs(search).then(setItems).catch((err: Error) => toast.error('搜索失败: ' + err.message));
    } else if (tab === 'library') {
      fetchItems();
    }
  }, [search, tab]);

  useEffect(() => {
    if (tab !== 'collections' || !activeCollection) { setCollItems([]); return; }
    api.listCollectionItems(activeCollection).then((d) => setCollItems(d.items))
      .catch((err: Error) => toast.error('加载集合条目失败: ' + err.message));
  }, [tab, activeCollection, collections]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleUseReference = async (item: SvgRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const full = await api.getSvg(item.id);
      await api.addReference({ name: full.name });
      toast.success('已添加参考元素: ' + full.name);
    } catch (err: any) { toast.error('添加参考失败: ' + (err.message || err)); }
  };

  // 拖拽到左侧设定面板投放区
  const handleDragStart = (item: SvgRecord, e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-aitmeow-ref', JSON.stringify({ id: item.id, name: item.name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnCollection = async (collId: string) => {
    const full = await api.getSvg(selectedId!);
    await api.addCollectionItems(collId, [full.id]);
    fetchCollections();
    toast.success('已加入集合');
  };

  return (
    <aside className="w-[340px] border-l border-slate-200 bg-white p-3 flex flex-col shrink-0">
      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 mb-3">
        <button onClick={() => setTab('library')}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${tab === 'library' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          成品
        </button>
        <button onClick={() => setTab('collections')}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${tab === 'collections' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          集合
        </button>
      </div>

      {tab === 'library' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 gap-2 focus-within:border-blue-400 transition-colors">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索成品..."
                className="bg-transparent text-xs text-slate-700 outline-none w-full placeholder:text-slate-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 gap-2 auto-rows-max content-start">
            {items.map((item) => {
              const selected = selectedId === item.id;
              return (
                <div key={item.id} onClick={() => onSelect(selected ? null : item.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(item, e)}
                  className={`relative border p-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                    selected ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm shadow-slate-50'
                  }`}>
                  <button
                    onClick={(e) => handleUseReference(item, e)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100"
                    title="添加为参考元素"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center scale-[0.35]" dangerouslySetInnerHTML={{ __html: item.svg_content }} />
                  </div>
                  <div className="text-[10px] font-medium text-slate-700 truncate w-full text-center leading-tight">{item.name}</div>
                </div>
              );
            })}
            {!connected && <div className="col-span-3 text-center text-slate-500 text-xs py-8">连接服务端以加载成品</div>}
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600 shrink-0 mt-2">
            <span className="text-[10px]">共 {total} 项</span>
            <div className="flex gap-0.5">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-[9px] hover:bg-slate-50 disabled:opacity-30 text-slate-600">‹</button>
              <span className="text-[10px] px-1">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-[9px] hover:bg-slate-50 disabled:opacity-30 text-slate-600">›</button>
            </div>
          </div>
        </>
      )}

      {tab === 'collections' && (
        <CollectionTree
          collections={collections}
          activeId={activeCollection}
          items={collItems}
          selectedId={selectedId}
          onSelectCollection={setActiveCollection}
          onSelectItem={onSelect}
          onRefresh={fetchCollections}
          onDropInto={handleDropOnCollection}
        />
      )}
    </aside>
  );
}

function kindLabel(kind: string) {
  return { batch: '批量', frameset: '帧序', manual: '分组' }[kind] || kind;
}

function CollectionTree({
  collections, activeId, items, selectedId, onSelectCollection, onSelectItem, onRefresh, onDropInto,
}: {
  collections: CollectionSummary[];
  activeId: string | null;
  items: SvgRecord[];
  selectedId: string | null;
  onSelectCollection: (id: string | null) => void;
  onSelectItem: (id: string | null) => void;
  onRefresh: () => void;
  onDropInto: (collId: string) => void;
}) {
  const { connected } = useConnectionStore();
  const [newName, setNewName] = useState('');

  const createColl = async () => {
    const name = newName.trim();
    if (!name) return toast.error('请输入集合名');
    try {
      await api.createCollection({ name });
      setNewName('');
      onRefresh();
      toast.success('集合已创建');
    } catch (err: any) { toast.error('创建失败: ' + (err.message || err)); }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1.5 mb-2">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createColl()}
          placeholder="新集合名…"
          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-400 placeholder:text-slate-400" />
        <button onClick={createColl}
          className="shrink-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-50">新建</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        <button
          onClick={() => onSelectCollection(null)}
          className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${activeId === null ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
          未分集合
        </button>
        {collections.map((c) => {
          const active = activeId === c.id;
          return (
            <div key={c.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (selectedId) onDropInto(c.id);
              }}
              className={`rounded-lg border transition-colors ${active ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <button
                onClick={() => onSelectCollection(active ? null : c.id)}
                className="w-full text-left px-2.5 py-2 flex items-center gap-2">
                <span className={`text-[10px] rounded px-1 py-0.5 font-medium ${c.kind === 'frameset' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {kindLabel(c.kind)}
                </span>
                <span className="flex-1 truncate text-xs font-medium text-slate-700">{c.name}</span>
                <span className="text-[10px] text-slate-400">{c.item_count}</span>
              </button>
              {active && (
                <div className="border-t border-blue-100 p-1.5 grid grid-cols-3 gap-1">
                  {items.length === 0 && <p className="col-span-3 text-[10px] text-slate-400 text-center py-2">暂无条目</p>}
                  {items.map((item) => (
                    <div key={item.id} onClick={() => onSelectItem(selectedId === item.id ? null : item.id)}
                      className={`border rounded-lg p-1 flex items-center justify-center cursor-pointer transition-all ${
                        selectedId === item.id ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <div className="w-8 h-8 flex items-center justify-center scale-[0.35]" dangerouslySetInnerHTML={{ __html: item.svg_content }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!connected && <p className="py-6 text-center text-xs text-slate-500">连接服务端以加载集合</p>}
      </div>
    </div>
  );
}
