import { useState, useEffect, useCallback } from 'react';
import { api, type SvgRecord } from '@/services/api';
import { useConnectionStore } from '@/stores/connectionStore';

interface HistoryThumbnailsProps {
  /** 递增此值会触发重新拉取列表（如保存成功后） */
  refreshKey: number;
  /** 选中某个历史记录时回调，传入 svg 内容与名称 */
  onSelect: (svg: string, name: string) => void;
}

const PREVIEW_COUNT = 14;

export default function HistoryThumbnails({ refreshKey, onSelect }: HistoryThumbnailsProps) {
  const { connected } = useConnectionStore();
  const [items, setItems] = useState<SvgRecord[]>([]);

  const fetchItems = useCallback(async () => {
    if (!connected) return;
    try {
      const data = await api.listSvgs({
        offset: 0,
        limit: PREVIEW_COUNT,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setItems(data.items);
    } catch {
      // 静默失败，不打扰主流程
    }
  }, [connected]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  if (!connected || items.length === 0) return null;

  return (
    <div className="mt-3 shrink-0 flex items-center gap-2">
      <span className="text-[10px] text-slate-400 shrink-0 select-none">历史</span>
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.svg_content, item.name)}
            title={item.name}
            className="group relative shrink-0 w-11 h-11 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all overflow-hidden flex items-center justify-center"
          >
            <div
              className="w-full h-full flex items-center justify-center scale-[0.3] pointer-events-none"
              dangerouslySetInnerHTML={{ __html: item.svg_content }}
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[8px] leading-tight px-0.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
