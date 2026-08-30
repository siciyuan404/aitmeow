import { useIconStudioStore, defaultIconSpec } from '@/stores/iconStudioStore';
import ColorPicker from '@/components/ColorPicker';
import type {
  IconShape,
  IconShapeKind,
  IconSpec,
  StrokeSpec,
  BackgroundSpec,
  PaletteSpec,
  StyleSpec,
  StrokeAlign,
  LineCap,
  LineJoin,
  ColorMode,
  IconStyle,
  StrokeWeight,
  DetailLevel,
  GridSnap,
} from '@/services/api';
import { getIconForValue } from '@/components/shapes';

const SHAPES: { kind: IconShapeKind; label: string }[] = [
  { kind: 'rounded_square', label: '圆角方' },
  { kind: 'square', label: '直角方' },
  { kind: 'circle', label: '圆形' },
  { kind: 'hexagon', label: '六边形' },
  { kind: 'octagon', label: '八边形' },
  { kind: 'diamond', label: '菱形' },
  { kind: 'free', label: '自由' },
];

const ASPECTS: { label: string; w: number; h: number }[] = [
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '16:9', w: 16, h: 9 },
  { label: '3:4', w: 3, h: 4 },
];

const ALIGNS: { v: StrokeAlign; label: string }[] = [
  { v: 'inside', label: '内对齐' },
  { v: 'center', label: '居中' },
  { v: 'outside', label: '外对齐' },
];
const CAPS: { v: LineCap; label: string }[] = [
  { v: 'butt', label: '平头' },
  { v: 'round', label: '圆头' },
  { v: 'square', label: '方头' },
];
const JOINS: { v: LineJoin; label: string }[] = [
  { v: 'miter', label: '尖角' },
  { v: 'round', label: '圆角' },
  { v: 'bevel', label: '斜切' },
];
const COLOR_MODES: { v: ColorMode; label: string }[] = [
  { v: 'full_color', label: '全彩' },
  { v: 'monochrome', label: '单色' },
  { v: 'duotone', label: '双色调' },
  { v: 'outline', label: '线稿' },
  { v: 'flat', label: '扁平' },
  { v: 'gradient', label: '渐变' },
];
const STYLES: { v: IconStyle; label: string }[] = [
  { v: 'flat', label: '扁平' },
  { v: 'line', label: '线性' },
  { v: 'filled', label: '面性' },
  { v: 'duotone', label: '双色' },
  { v: 'hand_drawn', label: '手绘' },
  { v: 'pixel', label: '像素' },
  { v: 'gradient', label: '渐变' },
  { v: 'three_d', label: '3D' },
  { v: 'glass', label: '玻璃' },
];
const WEIGHTS: { v: StrokeWeight; label: string }[] = [
  { v: 'hairline', label: '极细' },
  { v: 'thin', label: '细' },
  { v: 'regular', label: '常规' },
  { v: 'bold', label: '粗' },
  { v: 'black', label: '极粗' },
];
const DETAILS: { v: DetailLevel; label: string }[] = [
  { v: 'minimal', label: '极简' },
  { v: 'balanced', label: '适中' },
  { v: 'detailed', label: '丰富' },
];
const GRIDS: { v: GridSnap; label: string }[] = [
  { v: 'off', label: '关' },
  { v: 'pt2', label: '2' },
  { v: 'pt4', label: '4' },
  { v: 'pt8', label: '8' },
];

function sectionTitle(text: string) {
  return (
    <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{text}</div>
  );
}

export default function IconSpecPanel() {
  const spec = useIconStudioStore((s) => s.spec);
  const patch = useIconStudioStore((s) => s.patchSpec);

  const setShape = (kind: IconShapeKind) => {
    const next: IconShape =
      kind === 'rounded_square' ? { kind, radius: 0.22 } : { kind };
    patch({ shape: next });
  };

  const setStroke = (fn: (s: StrokeSpec) => StrokeSpec) => {
    patch({ stroke: fn(spec.stroke) });
  };
  const strokeIsLine = spec.stroke.kind === 'line';
  const line = strokeIsLine
    ? (spec.stroke as Required<Omit<StrokeSpec, 'kind'>>)
    : undefined;

  const setBg = (fn: (b: BackgroundSpec) => BackgroundSpec) => {
    patch({ background: fn(spec.background) });
  };
  const setPalette = (fn: (p: PaletteSpec) => PaletteSpec) => {
    patch({ palette: fn(spec.palette) });
  };
  const setStyle = (fn: (s: StyleSpec) => StyleSpec) => {
    patch({ style: fn(spec.style) });
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-2 text-slate-700">
      {/* 形状 */}
      <div>
        {sectionTitle('形状')}
        <div className="grid grid-cols-7 gap-1">
          {SHAPES.map((s) => {
            const Icon = getIconForValue(s.kind);
            const active = spec.shape.kind === s.kind;
            return (
              <button
                key={s.kind}
                type="button"
                onClick={() => setShape(s.kind)}
                title={s.label}
                className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-colors ${
                  active
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="text-[9px] font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
        {spec.shape.kind === 'rounded_square' && (
          <NumberRow label="圆角比例" value={spec.shape.radius ?? 0.22} min={0} max={0.5} step={0.01}
            onChange={(v) => patch({ shape: { kind: 'rounded_square', radius: v } })} percent />
        )}
      </div>

      {/* 构图 */}
      <div>
        {sectionTitle('构图')}
        <div className="flex gap-1">
          {ASPECTS.map((a) => {
            const active = spec.aspect.w === a.w && spec.aspect.h === a.h;
            return (
              <button key={a.label} type="button" onClick={() => patch({ aspect: { w: a.w, h: a.h } })}
                className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}>{a.label}</button>
            );
          })}
        </div>
        <NumberRow label="画布基准" value={spec.base_size} min={16} max={4096} step={16}
          onChange={(v) => patch({ base_size: v })} />
        <NumberRow label="内边距" value={spec.inset} min={0} max={0.45} step={0.01}
          onChange={(v) => patch({ inset: v })} percent />
        <NumberRow label="安全区" value={spec.safe_area} min={0.5} max={1} step={0.01}
          onChange={(v) => patch({ safe_area: v })} percent />
        <NumberRow label="光学过冲" value={spec.overshoot} min={0} max={0.1} step={0.005}
          onChange={(v) => patch({ overshoot: v })} percent />
        <NumberRow label="视觉重心" value={spec.optical_shift} min={-0.1} max={0.1} step={0.005}
          onChange={(v) => patch({ optical_shift: v })} percent signed />
        <NumberRow label="旋转角度" value={spec.rotation} min={0} max={360} step={15}
          onChange={(v) => patch({ rotation: v })} suffix="°" />
      </div>

      {/* 描边 */}
      <div>
        {sectionTitle('描边')}
        <ToggleRow label="开启外框" checked={strokeIsLine}
          onChange={(on) => patch({ stroke: on ? { kind: 'line', color: '#1F2937', width: 0.04, dash: 0, gap: 0.04, dotted: false, double: false, align: 'inside', cap: 'round', join: 'round' } : { kind: 'none' } })} />
        {strokeIsLine && line && (
          <div className="space-y-1.5">
            <ColorRow label="颜色" value={line.color} onChange={(c) => setStroke((s) => ({ ...s, color: c }))} />
            <NumberRow label="线宽" value={line.width} min={0.001} max={0.3} step={0.005}
              onChange={(v) => setStroke((s) => ({ ...s, width: v }))} percent />
            <div className="flex flex-wrap gap-1.5">
              <ChipToggle label="虚线" on={line.dash > 0} onToggle={(on) => setStroke((s) => ({ ...s, dash: on ? 0.08 : 0 }))} />
              <ChipToggle label="点线" on={line.dotted} onToggle={(on) => setStroke((s) => ({ ...s, dotted: on }))} />
              <ChipToggle label="双线" on={line.double} onToggle={(on) => setStroke((s) => ({ ...s, double: on }))} />
            </div>
            <SegmentedRow label="对齐" options={ALIGNS} value={line.align}
              onChange={(v) => setStroke((s) => ({ ...s, align: v as StrokeAlign }))} />
            <SegmentedRow label="端点" options={CAPS} value={line.cap}
              onChange={(v) => setStroke((s) => ({ ...s, cap: v as LineCap }))} />
            <SegmentedRow label="拐角" options={JOINS} value={line.join}
              onChange={(v) => setStroke((s) => ({ ...s, join: v as LineJoin }))} />
          </div>
        )}
      </div>

      {/* 背景 */}
      <div>
        {sectionTitle('背景')}
        <div className="flex gap-1">
          {(['transparent', 'solid', 'linear_gradient'] as const).map((k) => {
            const label = k === 'transparent' ? '透明' : k === 'solid' ? '纯色' : '渐变';
            const active = spec.background.kind === k;
            return (
              <button key={k} type="button"
                onClick={() => patch({ background: k === 'transparent' ? { kind: 'transparent' } : k === 'solid' ? { kind: 'solid', color: '#E2E8F0' } : { kind: 'linear_gradient', from: '#3B82F6', to: '#06B6D4', angle: 90 } })}
                className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}>{label}</button>
            );
          })}
        </div>
        {spec.background.kind === 'solid' && (
          <ColorRow label="底色" value={spec.background.color!} onChange={(c) => setBg((b) => ({ ...b, color: c }))} />
        )}
        {spec.background.kind === 'linear_gradient' && (
          <div className="space-y-1.5">
            <ColorRow label="起始" value={spec.background.from!} onChange={(c) => setBg((b) => ({ ...b, from: c }))} />
            <ColorRow label="结束" value={spec.background.to!} onChange={(c) => setBg((b) => ({ ...b, to: c }))} />
            <NumberRow label="角度" value={spec.background.angle ?? 90} min={0} max={360} step={15}
              onChange={(v) => setBg((b) => ({ ...b, angle: v }))} suffix="°" />
          </div>
        )}
      </div>

      {/* 色彩 */}
      <div>
        {sectionTitle('色彩')}
        <div className="grid grid-cols-3 gap-1">
          {COLOR_MODES.map((m) => {
            const active = spec.palette.mode === m.v;
            return (
              <button key={m.v} type="button" onClick={() => setPalette((p) => ({ ...p, mode: m.v }))}
                className={`rounded-lg border py-1.5 text-[10px] font-medium transition-colors ${
                  active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}>{m.label}</button>
            );
          })}
        </div>
        <ColorRow label="主色" value={spec.palette.primary ?? '#3B82F6'} optional
          onClear={() => setPalette((p) => ({ ...p, primary: null }))}
          onChange={(c) => setPalette((p) => ({ ...p, primary: c }))} />
        <ColorRow label="辅色" value={spec.palette.secondary ?? '#93C5FD'} optional
          onClear={() => setPalette((p) => ({ ...p, secondary: null }))}
          onChange={(c) => setPalette((p) => ({ ...p, secondary: c }))} />
      </div>

      {/* 风格 */}
      <div>
        {sectionTitle('风格')}
        <div className="grid grid-cols-5 gap-1">
          {STYLES.map((m) => {
            const active = spec.style.style === m.v;
            return (
              <button key={m.v} type="button" onClick={() => setStyle((s) => ({ ...s, style: m.v }))}
                className={`rounded-lg border py-1.5 text-[10px] font-medium transition-colors ${
                  active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}>{m.label}</button>
            );
          })}
        </div>
        <SegmentedRow label="线条" options={WEIGHTS} value={spec.style.weight}
          onChange={(v) => setStyle((s) => ({ ...s, weight: v as StrokeWeight }))} />
        <SegmentedRow label="细节" options={DETAILS} value={spec.style.detail}
          onChange={(v) => setStyle((s) => ({ ...s, detail: v as DetailLevel }))} />
        <SegmentedRow label="网格" options={GRIDS} value={spec.style.grid}
          onChange={(v) => setStyle((s) => ({ ...s, grid: v as GridSnap }))} />
      </div>

      {/* 动画 & 约束 */}
      <div>
        {sectionTitle('动画')}
        <ToggleRow label="帧序列生成" checked={spec.animation.enabled}
          onChange={(on) => patch({ animation: { enabled: on, frames: on ? Math.max(1, spec.animation.frames) : 1 } })} />
        {spec.animation.enabled && (
          <NumberRow label="帧数" value={spec.animation.frames} min={2} max={64} step={1}
            onChange={(v) => patch({ animation: { enabled: true, frames: v } })} suffix="帧" />
        )}
      </div>

      <div>
        {sectionTitle('约束')}
        <ToggleRow label="允许文字" checked={spec.allow_text}
          onChange={(on) => patch({ allow_text: on })} />
      </div>

      <button type="button" onClick={() => patch(defaultIconSpec())}
        className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50">
        恢复默认设定
      </button>
    </div>
  );
}

function NumberRow({
  label, value, min, max, step, onChange, percent, signed, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; percent?: boolean; signed?: boolean; suffix?: string;
}) {
  const display = signed
    ? `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`
    : percent
      ? `${Math.round(value * 100)}%`
      : `${value}${suffix ?? ''}`;
  return (
    <div className="mt-1 flex items-center gap-2">
      <label className="w-16 shrink-0 text-[11px] text-slate-600">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-slate-500">{display}</span>
    </div>
  );
}

function ColorRow({ label, value, optional, onChange, onClear }: {
  label: string; value: string; optional?: boolean; onChange: (c: string) => void; onClear?: () => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <label className="w-16 shrink-0 text-[11px] text-slate-600">{label}</label>
      <div className="flex flex-1 items-center gap-1.5">
        <ColorPicker value={value} onChange={onChange} />
        {optional && onClear && (
          <button type="button" onClick={onClear} title="不指定" className="text-slate-400 hover:text-slate-600">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1">
      <span className="text-[11px] text-slate-600">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    </label>
  );
}

function ChipToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!on)}
      className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
        on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
      }`}>{label}</button>
  );
}

function SegmentedRow<T extends string>({ label, options, value, onChange }: {
  label: string; options: { v: T; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <label className="w-16 shrink-0 text-[11px] text-slate-600">{label}</label>
      <div className="flex flex-1 gap-1">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button key={o.v} type="button" onClick={() => onChange(o.v)}
              className={`flex-1 rounded-md border py-1 text-[10px] font-medium transition-colors ${
                active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}
