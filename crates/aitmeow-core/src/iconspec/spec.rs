//! 图标生成设定的数据结构。
//!
//! 所有尺寸类字段都是**占短边的比例**而不是绝对像素，这样同一份设定换
//! `base_size` 从 512 到 1024 时，视觉权重完全一致。

use crate::error::{AitmeowError, Result};
use crate::iconspec::shape::{IconShape, ShapeBox};
use crate::iconspec::{escape_attr, fmt_num, BG_GRADIENT_ID};
use serde::{Deserialize, Serialize};

/// 一次批量生成最多多少帧。
pub const MAX_FRAMES: u32 = 64;

const MIN_BASE_SIZE: u32 = 16;
const MAX_BASE_SIZE: u32 = 4096;
/// 内边距上限：再大形状就没地方了。
const MAX_INSET: f64 = 0.45;
/// 安全区下限：再小内容就看不见了。
const MIN_SAFE_AREA: f64 = 0.5;
/// 光学过冲与视觉重心的调节上限。
const MAX_OPTICAL: f64 = 0.1;

fn default_base_size() -> u32 {
    512
}
fn default_frames() -> u32 {
    1
}
fn default_stroke_width() -> f64 {
    0.04
}
fn default_dash() -> f64 {
    0.08
}
fn default_gap() -> f64 {
    0.04
}
fn default_one() -> f64 {
    1.0
}

fn ok_ratio(v: f64) -> bool {
    v.is_finite() && v >= 0.0
}

// ────────────────────────────── 宽高比 ──────────────────────────────

/// 画布宽高比。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct AspectRatio {
    pub w: u32,
    pub h: u32,
}

impl AspectRatio {
    pub const SQUARE: AspectRatio = AspectRatio { w: 1, h: 1 };
    pub const WIDE: AspectRatio = AspectRatio { w: 16, h: 9 };
    pub const LANDSCAPE: AspectRatio = AspectRatio { w: 4, h: 3 };
    pub const PORTRAIT: AspectRatio = AspectRatio { w: 3, h: 4 };

    pub fn new(w: u32, h: u32) -> Result<Self> {
        if w == 0 || h == 0 {
            return Err(AitmeowError::Validation(
                "宽高比的两项都必须大于 0".to_string(),
            ));
        }
        Ok(Self { w, h })
    }

    /// 按长边像素 `base` 算出画布尺寸。
    pub fn canvas(&self, base: u32) -> (f64, f64) {
        let base = base as f64;
        if self.w >= self.h {
            (base, base * self.h as f64 / self.w as f64)
        } else {
            (base * self.w as f64 / self.h as f64, base)
        }
    }
}

impl Default for AspectRatio {
    fn default() -> Self {
        Self::SQUARE
    }
}

// ────────────────────────────── 描边 ──────────────────────────────

/// 描边相对形状边界的位置。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StrokeAlign {
    /// 贴着裁切边界内侧，描边完全落在形状里面
    Inside,
    /// 骑在形状边界上，一半内一半外
    Center,
    /// 完全在形状边界外侧，形状本体不受侵占
    Outside,
}

impl Default for StrokeAlign {
    fn default() -> Self {
        StrokeAlign::Inside
    }
}

/// 线段的端点形状。点线会强制使用 `Round`，否则零长度实段画不出点。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LineCap {
    Butt,
    Round,
    Square,
}

impl Default for LineCap {
    fn default() -> Self {
        LineCap::Round
    }
}

impl LineCap {
    pub fn as_str(&self) -> &'static str {
        match self {
            LineCap::Butt => "butt",
            LineCap::Round => "round",
            LineCap::Square => "square",
        }
    }
}

/// 拐角形状。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LineJoin {
    Miter,
    Round,
    Bevel,
}

impl Default for LineJoin {
    fn default() -> Self {
        LineJoin::Round
    }
}

impl LineJoin {
    pub fn as_str(&self) -> &'static str {
        match self {
            LineJoin::Miter => "miter",
            LineJoin::Round => "round",
            LineJoin::Bevel => "bevel",
        }
    }
}

/// 描边设定。线型用布尔标志区分而不是每种线一个枚举变体，
/// 因为前端是个下拉选择器，而且「虚线 + 双线」这类组合本身就该允许。
///
/// `width` / `dash` / `gap` 均为占画布短边的比例。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum StrokeSpec {
    None,
    Line {
        color: String,
        #[serde(default = "default_stroke_width")]
        width: f64,
        /// 虚线实段长度；为 0 即实线
        #[serde(default)]
        dash: f64,
        /// 虚线间隔 / 点间距 / 双线内环间距
        #[serde(default = "default_gap")]
        gap: f64,
        /// 点线：零长度实段 + 圆头
        #[serde(default)]
        dotted: bool,
        /// 双线：在里侧再画一圈同心线
        #[serde(default)]
        double: bool,
        #[serde(default)]
        align: StrokeAlign,
        #[serde(default)]
        cap: LineCap,
        #[serde(default)]
        join: LineJoin,
    },
}

impl Default for StrokeSpec {
    fn default() -> Self {
        StrokeSpec::None
    }
}

impl StrokeSpec {
    pub fn none() -> Self {
        StrokeSpec::None
    }

    pub fn solid(color: impl Into<String>, width: f64) -> Self {
        StrokeSpec::Line {
            color: color.into(),
            width,
            dash: 0.0,
            gap: default_gap(),
            dotted: false,
            double: false,
            align: StrokeAlign::default(),
            cap: LineCap::default(),
            join: LineJoin::default(),
        }
    }

    pub fn dashed(color: impl Into<String>, width: f64) -> Self {
        Self::solid(color, width).with_dash(default_dash())
    }

    pub fn dotted(color: impl Into<String>, width: f64) -> Self {
        Self::solid(color, width).with_dotted(true)
    }

    pub fn double(color: impl Into<String>, width: f64) -> Self {
        Self::solid(color, width).with_double(true)
    }

    /// 改一项线型参数。对 `None` 调用是空操作，链式写起来不用先判空。
    fn map_line(mut self, f: impl FnOnce(&mut LineParts)) -> Self {
        if let StrokeSpec::Line {
            width,
            dash,
            gap,
            dotted,
            double,
            align,
            cap,
            join,
            ..
        } = &mut self
        {
            f(&mut LineParts {
                width,
                dash,
                gap,
                dotted,
                double,
                align,
                cap,
                join,
            });
        }
        self
    }

    pub fn with_width(self, width: f64) -> Self {
        self.map_line(|l| *l.width = width)
    }
    pub fn with_dash(self, dash: f64) -> Self {
        self.map_line(|l| *l.dash = dash)
    }
    pub fn with_gap(self, gap: f64) -> Self {
        self.map_line(|l| *l.gap = gap)
    }
    pub fn with_dotted(self, dotted: bool) -> Self {
        self.map_line(|l| *l.dotted = dotted)
    }
    pub fn with_double(self, double: bool) -> Self {
        self.map_line(|l| *l.double = double)
    }
    pub fn with_align(self, align: StrokeAlign) -> Self {
        self.map_line(|l| *l.align = align)
    }
    pub fn with_cap(self, cap: LineCap) -> Self {
        self.map_line(|l| *l.cap = cap)
    }
    pub fn with_join(self, join: LineJoin) -> Self {
        self.map_line(|l| *l.join = join)
    }

    pub fn is_none(&self) -> bool {
        matches!(self, StrokeSpec::None)
    }

    pub fn is_double(&self) -> bool {
        matches!(self, StrokeSpec::Line { double: true, .. })
    }

    /// 取出线型字段的摊平视图。返回所有权而非引用——`LineFields` 是临时拼出来的。
    fn line(&self) -> Option<LineFields<'_>> {
        match self {
            StrokeSpec::None => None,
            StrokeSpec::Line {
                color,
                width,
                dash,
                gap,
                dotted,
                double,
                align,
                cap,
                join,
            } => Some(LineFields {
                color: color.as_str(),
                width: *width,
                dash: *dash,
                gap: *gap,
                dotted: *dotted,
                double: *double,
                align: *align,
                cap: *cap,
                join: *join,
            }),
        }
    }

    pub fn color(&self) -> Option<&str> {
        match self {
            StrokeSpec::None => None,
            StrokeSpec::Line { color, .. } => Some(color),
        }
    }

    pub fn width_px(&self, w: f64, h: f64) -> f64 {
        self.line().map_or(0.0, |l| l.width) * w.min(h)
    }

    pub fn gap_px(&self, w: f64, h: f64) -> f64 {
        self.line().map_or(0.0, |l| l.gap) * w.min(h)
    }

    /// 形状外侧需要为描边预留多少，保证描边不超出画布。
    pub fn outer_pad_px(&self, w: f64, h: f64) -> f64 {
        let l = match self.line() {
            Some(l) => l,
            None => return 0.0,
        };
        let width = self.width_px(w, h);
        match l.align {
            StrokeAlign::Inside => 0.0,
            StrokeAlign::Center => width / 2.0,
            StrokeAlign::Outside => width,
        }
    }

    /// 内容需要再往里让多少，保证描边不会压在内容上。
    pub fn inner_eat_px(&self, w: f64, h: f64) -> f64 {
        let l = match self.line() {
            Some(l) => l,
            None => return 0.0,
        };
        let width = self.width_px(w, h);
        match l.align {
            StrokeAlign::Inside => width,
            StrokeAlign::Center => width / 2.0,
            StrokeAlign::Outside => 0.0,
        }
    }

    /// 双线内环相对形状路径要内缩多少；非双线返回 `None`。
    pub fn inner_inset_px(&self, w: f64, h: f64) -> Option<f64> {
        if self.is_double() {
            Some(self.width_px(w, h) + self.gap_px(w, h))
        } else {
            None
        }
    }

    /// 生成描边属性串。无描边返回 `None`。
    pub fn attrs(&self, w: f64, h: f64) -> Option<String> {
        let l = self.line()?;
        let m = w.min(h);

        let mut s = format!(
            "stroke=\"{}\" stroke-width=\"{}\"",
            escape_attr(l.color),
            fmt_num(l.width * m)
        );

        if l.dotted {
            // 零长度实段 + 圆头 = 一串点。cap 被强制成 round，否则点根本画不出来。
            s.push_str(&format!(" stroke-dasharray=\"0 {}\"", fmt_num(l.gap * m)));
        } else if l.dash > 0.0 {
            s.push_str(&format!(
                " stroke-dasharray=\"{} {}\"",
                fmt_num(l.dash * m),
                fmt_num(l.gap * m)
            ));
        }

        let cap = if l.dotted { LineCap::Round } else { l.cap };
        s.push_str(&format!(
            " stroke-linecap=\"{}\" stroke-linejoin=\"{}\" fill=\"none\"",
            cap.as_str(),
            l.join.as_str()
        ));
        Some(s)
    }

    pub fn validate(&self) -> Result<()> {
        let l = match self.line() {
            Some(l) => l,
            None => return Ok(()),
        };
        require_positive("描边线宽", l.width)?;
        require_ratio("虚线实段", l.dash)?;
        if l.dotted || l.double {
            require_positive("描边间距", l.gap)?;
        } else {
            require_ratio("描边间隔", l.gap)?;
        }
        if l.dash > 0.0 && l.gap <= 0.0 {
            return Err(AitmeowError::Validation(
                "虚线必须同时给出正的间隔".to_string(),
            ));
        }
        Ok(())
    }
}

/// 把枚举变体的字段摊平成一份只读视图，省掉每个方法都写一长串 match。
struct LineFields<'a> {
    color: &'a str,
    width: f64,
    dash: f64,
    gap: f64,
    dotted: bool,
    double: bool,
    align: StrokeAlign,
    cap: LineCap,
    join: LineJoin,
}

/// 与 [`LineFields`] 对应，但持的是可变引用，供 `with_*` 链式修改用。
struct LineParts<'a> {
    width: &'a mut f64,
    dash: &'a mut f64,
    gap: &'a mut f64,
    dotted: &'a mut bool,
    double: &'a mut bool,
    align: &'a mut StrokeAlign,
    cap: &'a mut LineCap,
    join: &'a mut LineJoin,
}

fn require_ratio(name: &str, v: f64) -> Result<()> {
    if ok_ratio(v) {
        Ok(())
    } else {
        Err(AitmeowError::Validation(format!(
            "{}必须是非负的有限数值，收到 {}",
            name, v
        )))
    }
}

fn require_positive(name: &str, v: f64) -> Result<()> {
    if v.is_finite() && v > 0.0 {
        Ok(())
    } else {
        Err(AitmeowError::Validation(format!(
            "{}必须是正数，收到 {}",
            name, v
        )))
    }
}

// ────────────────────────────── 背景 ──────────────────────────────

/// 图标背景。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BackgroundSpec {
    Transparent,
    Solid {
        color: String,
    },
    /// 线性渐变，`angle` 沿用 CSS 约定：0° 自下而上，90° 自左而右。
    LinearGradient {
        from: String,
        to: String,
        #[serde(default)]
        angle: f64,
    },
}

impl Default for BackgroundSpec {
    fn default() -> Self {
        BackgroundSpec::Transparent
    }
}

impl BackgroundSpec {
    /// 底板的 `fill` 值；透明背景返回 `None`（不画底板）。
    pub fn fill(&self) -> Option<String> {
        match self {
            BackgroundSpec::Transparent => None,
            BackgroundSpec::Solid { color } => Some(color.clone()),
            BackgroundSpec::LinearGradient { .. } => {
                Some(format!("url(#{})", BG_GRADIENT_ID))
            }
        }
    }

    /// 背景需要写进 `<defs>` 的定义；非渐变返回 `None`。
    pub fn defs(&self) -> Option<String> {
        match self {
            BackgroundSpec::LinearGradient { from, to, angle } => {
                let a = angle.to_radians();
                let (dx, dy) = (a.sin(), -a.cos());
                Some(format!(
                    "<linearGradient id=\"{id}\" x1=\"{x1}\" y1=\"{y1}\" x2=\"{x2}\" y2=\"{y2}\">\
                     <stop offset=\"0\" stop-color=\"{from}\"/>\
                     <stop offset=\"1\" stop-color=\"{to}\"/></linearGradient>",
                    id = BG_GRADIENT_ID,
                    x1 = fmt_num(0.5 - dx / 2.0),
                    y1 = fmt_num(0.5 - dy / 2.0),
                    x2 = fmt_num(0.5 + dx / 2.0),
                    y2 = fmt_num(0.5 + dy / 2.0),
                    from = escape_attr(from),
                    to = escape_attr(to),
                ))
            }
            _ => None,
        }
    }
}

// ────────────────────────────── 色彩 ──────────────────────────────

/// 色彩模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ColorMode {
    /// 全彩，色彩自由
    FullColor,
    /// 单色，用 `currentColor` 输出，便于主题化
    Monochrome,
    /// 双色调：一个主色 + 一个辅色
    Duotone,
    /// 纯线稿，不填色只描边
    Outline,
    /// 扁平填色，禁用渐变和阴影
    Flat,
    /// 渐变
    Gradient,
}

impl Default for ColorMode {
    fn default() -> Self {
        ColorMode::FullColor
    }
}

/// 配色设定。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PaletteSpec {
    #[serde(default)]
    pub mode: ColorMode,
    #[serde(default)]
    pub primary: Option<String>,
    #[serde(default)]
    pub secondary: Option<String>,
}

impl Default for PaletteSpec {
    fn default() -> Self {
        Self {
            mode: ColorMode::default(),
            primary: None,
            secondary: None,
        }
    }
}

// ────────────────────────────── 风格 ──────────────────────────────

/// 图标风格。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IconStyle {
    Flat,
    Line,
    Filled,
    Duotone,
    HandDrawn,
    Pixel,
    Gradient,
    ThreeD,
    Glass,
}

impl Default for IconStyle {
    fn default() -> Self {
        IconStyle::Flat
    }
}

/// 线条粗细档位，影响模型笔触的视觉重量。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StrokeWeight {
    Hairline,
    Thin,
    Regular,
    Bold,
    Black,
}

impl Default for StrokeWeight {
    fn default() -> Self {
        StrokeWeight::Regular
    }
}

/// 细节层级。小尺寸图标通常要 Minimal 才不糊。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetailLevel {
    Minimal,
    Balanced,
    Detailed,
}

impl Default for DetailLevel {
    fn default() -> Self {
        DetailLevel::Balanced
    }
}

/// 网格吸附。开启后要求元素落在对应网格上，边缘更干净。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GridSnap {
    Off,
    Pt2,
    Pt4,
    Pt8,
}

impl Default for GridSnap {
    fn default() -> Self {
        GridSnap::Off
    }
}

/// 风格设定。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct StyleSpec {
    #[serde(default)]
    pub style: IconStyle,
    #[serde(default)]
    pub weight: StrokeWeight,
    #[serde(default)]
    pub detail: DetailLevel,
    #[serde(default)]
    pub grid: GridSnap,
}

impl Default for StyleSpec {
    fn default() -> Self {
        Self {
            style: IconStyle::default(),
            weight: StrokeWeight::default(),
            detail: DetailLevel::default(),
            grid: GridSnap::default(),
        }
    }
}

// ────────────────────────────── 动画 ──────────────────────────────

/// 动画设定。产出形式是 **N 张独立帧 SVG**，不是一个带 SMIL 的文件。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationSpec {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_frames")]
    pub frames: u32,
}

impl Default for AnimationSpec {
    fn default() -> Self {
        Self {
            enabled: false,
            frames: 1,
        }
    }
}

impl AnimationSpec {
    /// 实际要生成的张数。关闭动画时恒为 1。
    pub fn frame_count(&self) -> u32 {
        if !self.enabled {
            1
        } else {
            self.frames.clamp(1, MAX_FRAMES)
        }
    }
}

// ────────────────────────────── 总设定 ──────────────────────────────

/// 一次图标生成的完整设定。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IconSpec {
    #[serde(default)]
    pub shape: IconShape,
    /// 形状旋转角度（度）。六边形旋转 30° 即从平边朝上变成尖角朝上。
    #[serde(default)]
    pub rotation: f64,
    #[serde(default)]
    pub aspect: AspectRatio,
    /// 画布长边像素，只影响坐标系，不影响清晰度。
    #[serde(default = "default_base_size")]
    pub base_size: u32,
    /// 内边距，占画布短边的比例（0 ~ 0.45）。
    #[serde(default)]
    pub inset: f64,
    /// 内容安全区：内容收在形状框的这个比例内（0.5 ~ 1）。
    /// 平台图标规范常用 0.8（iOS / Android adaptive icon 的安全区思路）。
    #[serde(default = "default_one")]
    pub safe_area: f64,
    /// 光学过冲：圆形/尖角元素略微外扩才显得与直边对齐（0 ~ 0.1）。
    #[serde(default)]
    pub overshoot: f64,
    /// 视觉重心垂直偏移，正值向上（±0.1）。
    #[serde(default)]
    pub optical_shift: f64,
    #[serde(default)]
    pub stroke: StrokeSpec,
    #[serde(default)]
    pub background: BackgroundSpec,
    #[serde(default)]
    pub palette: PaletteSpec,
    #[serde(default)]
    pub style: StyleSpec,
    /// 是否允许图标内出现文字。小尺寸下文字不可读，默认关闭。
    #[serde(default)]
    pub allow_text: bool,
    #[serde(default)]
    pub animation: AnimationSpec,
}

impl Default for IconSpec {
    fn default() -> Self {
        Self {
            shape: IconShape::default(),
            rotation: 0.0,
            aspect: AspectRatio::default(),
            base_size: default_base_size(),
            inset: 0.0,
            safe_area: 1.0,
            overshoot: 0.0,
            optical_shift: 0.0,
            stroke: StrokeSpec::default(),
            background: BackgroundSpec::default(),
            palette: PaletteSpec::default(),
            style: StyleSpec::default(),
            allow_text: false,
            animation: AnimationSpec::default(),
        }
    }
}

impl IconSpec {
    pub fn new(shape: IconShape) -> Self {
        Self {
            shape,
            ..Default::default()
        }
    }

    pub fn canvas(&self) -> (f64, f64) {
        self.aspect.canvas(self.base_size)
    }

    /// 形状路径所在矩形：画布内缩内边距 + 描边外侧占位。
    ///
    /// 返回 `Err` 表示内边距 + 描边把画布吃光了，调用方应提前拒绝这份设定。
    pub fn shape_box(&self) -> Result<ShapeBox> {
        let (w, h) = self.canvas();
        let pad = self.inset * w.min(h) + self.stroke.outer_pad_px(w, h);
        let b = ShapeBox::new(pad, pad, w - pad * 2.0, h - pad * 2.0);
        if b.w <= 0.0 || b.h <= 0.0 {
            return Err(AitmeowError::Validation(format!(
                "内边距与描边吃光了画布：需要 {}px 的空间，画布只有 {}x{}",
                fmt_num(pad * 2.0),
                fmt_num(w),
                fmt_num(h)
            )));
        }
        Ok(b)
    }

    /// 形状旋转后仍不溢出的等效框。
    pub fn rotated_shape_box(&self) -> Result<ShapeBox> {
        let b = self.shape_box()?;
        Ok(self.shape.rotated_box(&b, self.rotation))
    }

    /// 内容所在矩形：形状框再扣掉描边内侵、安全区，最后应用光学微调。
    pub fn content_box(&self, shape: &ShapeBox) -> Result<ShapeBox> {
        let (w, h) = self.canvas();

        let eat = self.stroke.inner_eat_px(w, h);
        let b = shape.shrink(eat).ok_or_else(|| {
            AitmeowError::Validation(format!(
                "描边吃光了内容区：线宽占 {}px，形状框只有 {}x{}",
                fmt_num(eat * 2.0),
                fmt_num(shape.w),
                fmt_num(shape.h)
            ))
        })?;

        let b = if self.safe_area < 1.0 {
            let pad = b.min_side() * (1.0 - self.safe_area) / 2.0;
            b.shrink(pad).ok_or_else(|| {
                AitmeowError::Validation(format!(
                    "安全区 {} 把内容区缩没了",
                    fmt_num(self.safe_area)
                ))
            })?
        } else {
            b
        };

        let b = if self.overshoot > 0.0 {
            b.expand(self.overshoot * b.min_side())
        } else {
            b
        };

        Ok(if self.optical_shift != 0.0 {
            b.shift_y(self.optical_shift * b.h)
        } else {
            b
        })
    }

    /// 双描边内环所在的矩形。
    pub fn inner_stroke_box(&self, b: &ShapeBox) -> Option<ShapeBox> {
        let (w, h) = self.canvas();
        self.stroke.inner_inset_px(w, h).and_then(|d| b.shrink(d))
    }

    pub fn validate(&self) -> Result<()> {
        if self.aspect.w == 0 || self.aspect.h == 0 {
            return Err(AitmeowError::Validation(
                "宽高比的两项都必须大于 0".to_string(),
            ));
        }
        if self.base_size < MIN_BASE_SIZE || self.base_size > MAX_BASE_SIZE {
            return Err(AitmeowError::Validation(format!(
                "画布基准尺寸必须在 {} ~ {} 之间，收到 {}",
                MIN_BASE_SIZE, MAX_BASE_SIZE, self.base_size
            )));
        }
        if !self.inset.is_finite() || self.inset < 0.0 || self.inset > MAX_INSET {
            return Err(AitmeowError::Validation(format!(
                "内边距必须在 0 ~ {} 之间，收到 {}",
                MAX_INSET, self.inset
            )));
        }
        if !self.rotation.is_finite() {
            return Err(AitmeowError::Validation(format!(
                "旋转角度必须是有限数值，收到 {}",
                self.rotation
            )));
        }
        if !self.safe_area.is_finite()
            || self.safe_area < MIN_SAFE_AREA
            || self.safe_area > 1.0
        {
            return Err(AitmeowError::Validation(format!(
                "安全区必须在 {} ~ 1 之间，收到 {}",
                MIN_SAFE_AREA, self.safe_area
            )));
        }
        if !self.overshoot.is_finite() || self.overshoot < 0.0 || self.overshoot > MAX_OPTICAL {
            return Err(AitmeowError::Validation(format!(
                "光学过冲必须在 0 ~ {} 之间，收到 {}",
                MAX_OPTICAL, self.overshoot
            )));
        }
        if !self.optical_shift.is_finite() || self.optical_shift.abs() > MAX_OPTICAL {
            return Err(AitmeowError::Validation(format!(
                "视觉重心偏移必须在 ±{} 之间，收到 {}",
                MAX_OPTICAL, self.optical_shift
            )));
        }
        if let IconShape::RoundedSquare { radius } = self.shape {
            if !radius.is_finite() || radius < 0.0 || radius > 0.5 {
                return Err(AitmeowError::Validation(format!(
                    "圆角比例必须在 0 ~ 0.5 之间，收到 {}",
                    radius
                )));
            }
        }
        self.stroke.validate()?;
        // 这两步会验证内边距/描边/安全区有没有把内容区吃光
        let shape = self.rotated_shape_box()?;
        self.content_box(&shape)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 几何量是浮点累加出来的，直接判等会被 51.2 + 25.6 = 76.80000000000001 这种坑绊倒。
    fn assert_box_eq(a: ShapeBox, b: ShapeBox) {
        let close = |x: f64, y: f64| (x - y).abs() < 1e-6;
        assert!(
            close(a.x, b.x) && close(a.y, b.y) && close(a.w, b.w) && close(a.h, b.h),
            "left: {:?} right: {:?}",
            a,
            b
        );
    }

    #[test]
    fn test_aspect_canvas_uses_long_edge() {
        assert_eq!(AspectRatio::SQUARE.canvas(512), (512.0, 512.0));
        assert_eq!(AspectRatio::WIDE.canvas(1600), (1600.0, 900.0));
        assert_eq!(AspectRatio::PORTRAIT.canvas(400), (300.0, 400.0));
    }

    #[test]
    fn test_aspect_rejects_zero() {
        assert!(AspectRatio::new(0, 1).is_err());
    }

    #[test]
    fn test_default_spec_is_valid() {
        IconSpec::default().validate().unwrap();
    }

    #[test]
    fn test_shape_box_subtracts_inset_and_stroke() {
        let mut spec = IconSpec::default();
        assert_box_eq(spec.shape_box().unwrap(), ShapeBox::new(0.0, 0.0, 512.0, 512.0));

        spec.inset = 0.1;
        assert_box_eq(
            spec.shape_box().unwrap(),
            ShapeBox::new(51.2, 51.2, 409.6, 409.6),
        );

        // 默认 Inside 对齐：描边不吃画布外的空间
        spec.stroke = StrokeSpec::solid("#000", 0.1);
        assert_box_eq(
            spec.shape_box().unwrap(),
            ShapeBox::new(51.2, 51.2, 409.6, 409.6),
        );
    }

    #[test]
    fn test_stroke_align_changes_padding() {
        let (w, h) = (512.0, 512.0);

        let inside = StrokeSpec::solid("#000", 0.1).with_align(StrokeAlign::Inside);
        assert_eq!(inside.outer_pad_px(w, h), 0.0);
        assert_eq!(inside.inner_eat_px(w, h), 51.2);

        let center = StrokeSpec::solid("#000", 0.1).with_align(StrokeAlign::Center);
        assert_eq!(center.outer_pad_px(w, h), 25.6);
        assert_eq!(center.inner_eat_px(w, h), 25.6);

        let outside = StrokeSpec::solid("#000", 0.1)
            .with_align(StrokeAlign::Outside);
        assert_eq!(outside.outer_pad_px(w, h), 51.2);
        assert_eq!(outside.inner_eat_px(w, h), 0.0);
    }

    #[test]
    fn test_content_box_never_touched_by_stroke() {
        // Inside：内容框内缩整个线宽，描边不压内容
        let spec = IconSpec {
            stroke: StrokeSpec::solid("#000", 0.1),
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        let content = spec.content_box(&shape).unwrap();
        assert_box_eq(content, ShapeBox::new(51.2, 51.2, 409.6, 409.6));

        // Outside：内容框就是形状框，描边在外面
        let spec = IconSpec {
            stroke: StrokeSpec::solid("#000", 0.1)
                .with_align(StrokeAlign::Outside),
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        assert_box_eq(shape, ShapeBox::new(51.2, 51.2, 409.6, 409.6));
        let content = spec.content_box(&shape).unwrap();
        assert_box_eq(content, shape);
    }

    #[test]
    fn test_safe_area_shrinks_content() {
        let spec = IconSpec {
            safe_area: 0.8,
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        let content = spec.content_box(&shape).unwrap();
        // 512 * (1-0.8)/2 = 51.2
        assert_box_eq(content, ShapeBox::new(51.2, 51.2, 409.6, 409.6));
    }

    #[test]
    fn test_overshoot_expands_and_shift_moves_up() {
        let spec = IconSpec {
            safe_area: 0.8,
            overshoot: 0.05,
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        let content = spec.content_box(&shape).unwrap();
        // 安全区缩到 409.6，再外扩 409.6*0.05 = 20.48
        assert_box_eq(content, ShapeBox::new(30.72, 30.72, 450.56, 450.56));

        let spec = IconSpec {
            optical_shift: 0.05,
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        let content = spec.content_box(&shape).unwrap();
        // 正值向上：y 减少
        assert_box_eq(content, ShapeBox::new(0.0, -25.6, 512.0, 512.0));
    }

    #[test]
    fn test_rotation_shrinks_shape_box() {
        let spec = IconSpec {
            shape: IconShape::Square,
            rotation: 45.0,
            ..Default::default()
        };
        let shape = spec.rotated_shape_box().unwrap();
        assert!(shape.w < 512.0, "旋转 45° 的正方形必须缩小: {:?}", shape);
        assert_eq!(shape.center(), (256.0, 256.0));
        spec.validate().unwrap();
    }

    #[test]
    fn test_stroke_attrs() {
        assert_eq!(StrokeSpec::none().attrs(512.0, 512.0), None);

        let s = StrokeSpec::solid("#111", 0.05);
        let a = s.attrs(512.0, 512.0).unwrap();
        assert!(a.contains("stroke-width=\"25.6\""), "实际: {}", a);
        assert!(a.contains("fill=\"none\""));
        assert!(a.contains("stroke-linecap=\"round\""));
        assert!(a.contains("stroke-linejoin=\"round\""));

        let s = StrokeSpec::dotted("#111", 0.05);
        let a = s.attrs(512.0, 512.0).unwrap();
        assert!(a.contains("stroke-dasharray=\"0 20.48\""), "实际: {}", a);
        assert!(a.contains("stroke-linecap=\"round\""));
    }

    #[test]
    fn test_dotted_forces_round_cap() {
        // 零长度实段配 butt cap 画不出点，必须强制 round
        let s = StrokeSpec::dotted("#000", 0.05).with_cap(LineCap::Butt);
        let a = s.attrs(512.0, 512.0).unwrap();
        assert!(a.contains("stroke-linecap=\"round\""), "实际: {}", a);
    }

    #[test]
    fn test_dashed_attrs() {
        let s = StrokeSpec::dashed("#111", 0.05);
        let a = s.attrs(512.0, 512.0).unwrap();
        assert!(a.contains("stroke-dasharray=\"40.96 20.48\""), "实际: {}", a);
    }

    #[test]
    fn test_stroke_validate_rejects_bad_values() {
        assert!(StrokeSpec::solid("#000", 0.0).validate().is_err());
        assert!(StrokeSpec::solid("#000", f64::NAN).validate().is_err());
        // 有 dash 却没 gap
        assert!(StrokeSpec::dashed("#000", 0.04).with_gap(0.0)
        .validate()
        .is_err());
    }

    #[test]
    fn test_double_stroke_inner_box() {
        let spec = IconSpec {
            stroke: StrokeSpec::double("#000", 0.04),
            ..Default::default()
        };
        let b = spec.rotated_shape_box().unwrap();
        let inner = spec.inner_stroke_box(&b).unwrap();
        // 线宽 20.48 + 默认间距 20.48
        assert_box_eq(inner, b.shrink(40.96).unwrap());
    }

    #[test]
    fn test_single_stroke_has_no_inner_box() {
        let spec = IconSpec {
            stroke: StrokeSpec::solid("#000", 0.04),
            ..Default::default()
        };
        let b = spec.rotated_shape_box().unwrap();
        assert_eq!(spec.inner_stroke_box(&b), None);
    }

    #[test]
    fn test_background_fill_and_defs() {
        assert_eq!(BackgroundSpec::Transparent.fill(), None);
        assert_eq!(
            BackgroundSpec::Solid { color: "#fff".into() }.fill(),
            Some("#fff".to_string())
        );
        assert_eq!(BackgroundSpec::Transparent.defs(), None);

        let g = BackgroundSpec::LinearGradient {
            from: "#fff".into(),
            to: "#000".into(),
            angle: 0.0,
        };
        assert_eq!(g.fill(), Some("url(#aitmeow-bg)".to_string()));
        let d = g.defs().unwrap();
        assert!(d.contains("y1=\"1\"") && d.contains("y2=\"0\""), "实际: {}", d);
    }

    #[test]
    fn test_animation_frame_count() {
        assert_eq!(AnimationSpec::default().frame_count(), 1);
        assert_eq!(
            AnimationSpec {
                enabled: true,
                frames: 8
            }
            .frame_count(),
            8
        );
        assert_eq!(
            AnimationSpec {
                enabled: false,
                frames: 8
            }
            .frame_count(),
            1
        );
        assert_eq!(
            AnimationSpec {
                enabled: true,
                frames: 9999
            }
            .frame_count(),
            MAX_FRAMES
        );
    }

    #[test]
    fn test_validate_rejects_out_of_range_optics() {
        let mut spec = IconSpec::default();
        spec.safe_area = 0.2;
        assert!(spec.validate().is_err());

        let mut spec = IconSpec::default();
        spec.overshoot = 0.9;
        assert!(spec.validate().is_err());

        let mut spec = IconSpec::default();
        spec.optical_shift = 0.5;
        assert!(spec.validate().is_err());

        let mut spec = IconSpec::default();
        spec.rotation = f64::INFINITY;
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_validate_rejects_bad_base_size_and_inset() {
        let mut spec = IconSpec::default();
        spec.base_size = 4;
        assert!(spec.validate().is_err());

        let mut spec = IconSpec::default();
        spec.inset = 0.9;
        assert!(spec.validate().is_err());

        let mut spec = IconSpec::default();
        spec.shape = IconShape::RoundedSquare { radius: 0.9 };
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_spec_serde_roundtrip() {
        let spec = IconSpec {
            shape: IconShape::Hexagon,
            rotation: 30.0,
            aspect: AspectRatio::WIDE,
            safe_area: 0.8,
            overshoot: 0.02,
            optical_shift: 0.01,
            stroke: StrokeSpec::dashed("#f00", 0.04)
                .with_align(StrokeAlign::Outside)
                .with_cap(LineCap::Square)
                .with_join(LineJoin::Miter),
            background: BackgroundSpec::Solid { color: "#eee".into() },
            palette: PaletteSpec {
                mode: ColorMode::Duotone,
                primary: Some("#111".into()),
                secondary: Some("#eee".into()),
            },
            style: StyleSpec {
                style: IconStyle::Line,
                weight: StrokeWeight::Bold,
                detail: DetailLevel::Minimal,
                grid: GridSnap::Pt8,
            },
            allow_text: true,
            animation: AnimationSpec {
                enabled: true,
                frames: 8,
            },
            ..Default::default()
        };
        let json = serde_json::to_string(&spec).unwrap();
        let back: IconSpec = serde_json::from_str(&json).unwrap();
        assert_eq!(spec, back);
    }

    #[test]
    fn test_spec_deserializes_with_defaults() {
        // 前端只发形状也要能解析，其余字段走默认
        let spec: IconSpec = serde_json::from_str(r#"{"shape":{"kind":"circle"}}"#).unwrap();
        assert_eq!(spec.shape, IconShape::Circle);
        assert_eq!(spec.rotation, 0.0);
        assert_eq!(spec.base_size, 512);
        assert_eq!(spec.aspect, AspectRatio::SQUARE);
        assert_eq!(spec.safe_area, 1.0);
        assert_eq!(spec.overshoot, 0.0);
        assert_eq!(spec.optical_shift, 0.0);
        assert_eq!(spec.stroke, StrokeSpec::None);
        assert_eq!(spec.background, BackgroundSpec::Transparent);
        assert_eq!(spec.palette, PaletteSpec::default());
        assert_eq!(spec.style, StyleSpec::default());
        assert!(!spec.allow_text);
        assert_eq!(spec.animation.frame_count(), 1);
    }

    #[test]
    fn test_stroke_defaults_apply_when_omitted() {
        // 用 r##：JSON 里的 "#000" 含 `"#`，会提前终止 r#"..."#
        let s: StrokeSpec = serde_json::from_str(r##"{"kind":"line","color":"#000"}"##).unwrap();
        assert_eq!(
            s,
            StrokeSpec::Line {
                color: "#000".into(),
                width: 0.04,
                dash: 0.0,
                gap: 0.04,
                dotted: false,
                double: false,
                align: StrokeAlign::Inside,
                cap: LineCap::Round,
                join: LineJoin::Round,
            }
        );
    }
}
