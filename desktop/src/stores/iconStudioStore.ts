import { create } from 'zustand';
import type { IconSpec } from '@/services/api';

export function defaultIconSpec(): IconSpec {
  return {
    shape: { kind: 'rounded_square', radius: 0.22 },
    rotation: 0,
    aspect: { w: 1, h: 1 },
    base_size: 512,
    inset: 0,
    safe_area: 1,
    overshoot: 0,
    optical_shift: 0,
    stroke: { kind: 'none' },
    background: { kind: 'transparent' },
    palette: { mode: 'full_color', primary: null, secondary: null },
    style: { style: 'flat', weight: 'regular', detail: 'balanced', grid: 'off' },
    allow_text: false,
    animation: { enabled: false, frames: 1 },
  };
}

interface ResultTrayItem {
  key: string;
  name: string;
  svg_content: string;
  frame_index?: number | null;
}

export interface IconPromptState {
  userPrompt: string;
  framePrompts: { index: number; prompt: string }[];
}

interface IconStudioState {
  enabled: boolean;
  spec: IconSpec;
  /** 当前批次生成结果（未入库），多选后「打包存入仓库」 */
  tray: ResultTrayItem[];
  selected: Set<string>;
  /** 帧序列生成进行中：下一条生成的 SVG 会自动带上帧号 */
  frameMode: boolean;
  /** 下一个要分配的帧号 */
  nextFrame: number;
  setEnabled: (enabled: boolean) => void;
  setSpec: (spec: IconSpec) => void;
  patchSpec: (patch: Partial<IconSpec>) => void;
  addTrayItem: (item: ResultTrayItem) => void;
  clearTray: () => void;
  toggleSelected: (key: string) => void;
  selectAll: (keys: string[]) => void;
  clearSelected: () => void;
  /** 开始一轮帧序列：清空托盘并重置帧号 */
  startFrameSession: () => void;
  /** 生成一条帧：若在 frameMode 则自动打帧号并递增 */
  addFrameItem: (item: Omit<ResultTrayItem, 'key' | 'frame_index'>) => void;
}

export const useIconStudioStore = create<IconStudioState>((set) => ({
  enabled: false,
  spec: defaultIconSpec(),
  tray: [],
  selected: new Set(),
  frameMode: false,
  nextFrame: 0,
  setEnabled: (enabled) => set({ enabled }),
  setSpec: (spec) => set({ spec }),
  patchSpec: (patch) => set((s) => ({ spec: { ...s.spec, ...patch } })),
  addTrayItem: (item) =>
    set((s) => {
      if (s.tray.some((t) => t.key === item.key)) return s;
      return { tray: [...s.tray, item] };
    }),
  clearTray: () => set({ tray: [], selected: new Set(), frameMode: false, nextFrame: 0 }),
  toggleSelected: (key) =>
    set((s) => {
      const next = new Set(s.selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { selected: next };
    }),
  selectAll: (keys) => set({ selected: new Set(keys) }),
  clearSelected: () => set({ selected: new Set() }),
  startFrameSession: () =>
    set((s) => ({
      tray: [],
      selected: new Set(),
      frameMode: s.spec.animation.enabled,
      nextFrame: 0,
    })),
  addFrameItem: (item) =>
    set((s) => {
      const key = `frame-${s.nextFrame}-${Date.now()}`;
      const entry: ResultTrayItem = {
        ...item,
        key,
        frame_index: s.frameMode ? s.nextFrame : null,
      };
      return {
        tray: [...s.tray, entry],
        nextFrame: s.frameMode ? s.nextFrame + 1 : s.nextFrame,
      };
    }),
}));
