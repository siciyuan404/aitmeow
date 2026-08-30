import { useState } from 'react';
import { toast } from 'sonner';
import { useIconStudioStore } from '@/stores/iconStudioStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { api } from '@/services/api';

interface ResultTrayProps {
  onSaved: () => void;
}

export default function ResultTray({ onSaved }: ResultTrayProps) {
  const { connected } = useConnectionStore();
  const spec = useIconStudioStore((s) => s.spec);
  const tray = useIconStudioStore((s) => s.tray);
  const selected = useIconStudioStore((s) => s.selected);
  const toggleSelected = useIconStudioStore((s) => s.toggleSelected);
  const selectAll = useIconStudioStore((s) => s.selectAll);
  const clearSelected = useIconStudioStore((s) => s.clearSelected);
  const clearTray = useIconStudioStore((s) => s.clearTray);

  const [saving, setSaving] = useState(false);

  if (tray.length === 0) return null;

  const allSelected = tray.every((t) => selected.has(t.key)) && tray.length > 0;
  const chosen = tray.filter((t) => selected.has(t.key));
  const hasFrames = tray.some((t) => t.frame_index != null);

  const toggleAll = () => (allSelected ? clearSelected() : selectAll(tray.map((t) => t.key)));

  const handleSave = async () => {
    if (chosen.length === 0) return toast.error('请先勾选要入库的条目');
    if (!connected) return toast.error('未连接服务端');
    setSaving(true);
    const name = prompt('集合名称：', `图标批次 ${new Date().toLocaleTimeString()}`)?.trim();
    if (!name) { setSaving(false); return; }
    try {
      const res = await api.batchSave({
        collection_name: name,
        kind: hasFrames ? 'frameset' : 'batch',
        apply: true,
        spec,
        items: chosen.map((t) => ({
          name: t.name,
          svg_content: t.svg_content,
          frame_index: t.frame_index ?? undefined,
        })),
      });
      toast.success(`已存入「${res.collection.name}」共 ${res.saved} 条`);
      clearSelected();
      clearTray();
      onSaved();
    } catch (e: any) {
      toast.error('入库失败: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 shrink-0 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">本次批次</span>
          <span className="text-[10px] text-slate-500">{tray.length} 张</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggleAll} className="text-[10px] text-slate-500 hover:text-blue-600 transition-colors px-1">
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button type="button" onClick={clearTray} title="清空批次"
            className="text-slate-400 hover:text-red-500 transition-colors p-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-2">
        {tray.map((t) => {
          const isSel = selected.has(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggleSelected(t.key)}
              title={t.name}
              className={`relative shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center transition-all ${
                isSel ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/30' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-full h-full flex items-center justify-center scale-[0.3] pointer-events-none" dangerouslySetInnerHTML={{ __html: t.svg_content }} />
              {t.frame_index != null && (
                <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl">{t.frame_index}</span>
              )}
              {isSel && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-200 px-3 py-2">
        <button type="button" onClick={handleSave} disabled={saving || chosen.length === 0 || !connected}
          className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-40">
          {saving ? '入库中…' : `打包存入仓库（${chosen.length}）`}
        </button>
      </div>
    </div>
  );
}
