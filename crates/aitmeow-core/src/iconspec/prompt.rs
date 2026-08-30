//! 把生成设定编译成给模型的 prompt 片段。
//!
//! 和形状裁切是两件事：`mask.rs` 保证成品**不会画出界**（硬保证），
//! 这里的 prompt 是让模型**主动往形状里构图**（软引导）。两边都要，
//! 只靠裁切会把边缘元素切掉一半。

use crate::error::{AitmeowError, Result};
use crate::iconspec::spec::{
    BackgroundSpec, ColorMode, DetailLevel, GridSnap, IconSpec, IconStyle, PaletteSpec,
    StrokeSpec, StrokeWeight,
};
use serde::{Deserialize, Serialize};

/// 一个参考元素。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReferenceItem {
    pub name: String,
    /// 用户对这份参考的补充说明，比如「只要它的配色」。
    #[serde(default)]
    pub hint: Option<String>,
}

impl ReferenceItem {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            hint: None,
        }
    }

    pub fn with_hint(mut self, hint: impl Into<String>) -> Self {
        self.hint = Some(hint.into());
        self
    }
}

/// 一次图标生成的 prompt 请求。
#[derive(Debug, Clone)]
pub struct IconPromptRequest<'a> {
    pub user_prompt: &'a str,
    pub spec: &'a IconSpec,
    pub refs: &'a [ReferenceItem],
    /// `(帧序号从 0 开始, 总帧数)`；非动画传 `None`。
    pub frame: Option<(u32, u32)>,
}

/// 编译 prompt。
pub fn compile_icon_prompt(req: &IconPromptRequest<'_>) -> Result<String> {
    let spec = req.spec;
    spec.validate()?;

    let user = req.user_prompt.trim();
    if user.is_empty() {
        return Err(AitmeowError::Validation(
            "生成需求不能为空".to_string(),
        ));
    }

    let (w, h) = spec.canvas();
    let mut out = String::with_capacity(1024);

    out.push_str(&format!("请为下面的需求设计一个图标 SVG：{}\n\n", user));
    out.push_str("硬性要求：\n");
    out.push_str(&format!(
        "- 画布固定 viewBox=\"0 0 {} {}\"，宽高比 {}:{}\n",
        crate::iconspec::fmt_num(w),
        crate::iconspec::fmt_num(h),
        spec.aspect.w,
        spec.aspect.h
    ));
    out.push_str(&format!(
        "- 主体必须完整容纳在{}以内，四周留出安全边距，不要贴边也不要画到形状外面\n",
        spec.shape.label()
    ));
    out.push_str("- 只输出 <svg>...</svg> 本身，不要 markdown 代码块，不要任何解释文字\n");
    out.push_str("- 只用 SVG 原生元素，不要引用外部资源，不要内嵌位图\n");

    if let Some(r) = rotation_rule(spec.rotation) {
        out.push_str(&format!("- {}\n", r));
    }
    if let Some(r) = safe_area_rule(spec.safe_area) {
        out.push_str(&format!("- {}\n", r));
    }
    if let Some(r) = optical_rule(spec.overshoot, spec.optical_shift) {
        out.push_str(&format!("- {}\n", r));
    }

    out.push_str(&format!("\n{}\n", style_rule(&spec.style)));
    out.push_str(&format!("{}\n", palette_rule(&spec.palette)));
    out.push_str(&format!("{}\n", background_rule(&spec.background)));
    out.push_str(&format!("{}\n", stroke_rule(&spec.stroke)));
    out.push_str(&format!("{}\n", text_rule(spec.allow_text)));

    if let Some((index, total)) = req.frame {
        if spec.animation.enabled && total > 1 {
            out.push_str(&format!(
                "\n这是 {} 帧循环动画的第 {} 帧：\n\
                 - 只表现这一瞬间的姿态，不要画帧序号或进度条\n\
                 - 相邻帧之间只做小幅位移/旋转/缩放，保持主体和配色一致\n\
                 - 第 {} 帧要能平滑衔接回第 1 帧\n",
                total,
                index + 1,
                total
            ));
        }
    }

    let refs: Vec<&ReferenceItem> = req
        .refs
        .iter()
        .filter(|r| !r.name.trim().is_empty())
        .collect();
    if !refs.is_empty() {
        out.push_str("\n参考元素（只借鉴风格/构图/配色，不要照抄）：\n");
        for r in refs {
            match &r.hint {
                Some(hint) if !hint.trim().is_empty() => {
                    out.push_str(&format!("- {}：{}\n", r.name.trim(), hint.trim()))
                }
                _ => out.push_str(&format!("- {}\n", r.name.trim())),
            }
        }
    }

    Ok(out)
}

/// 旋转只作用于外框，主体保持正立——否则 logo 会跟着歪。
fn rotation_rule(rotation_deg: f64) -> Option<String> {
    let d = rotation_deg % 360.0;
    if d.abs() < 1e-9 {
        return None;
    }
    Some(format!(
        "外框形状整体旋转 {}°，但主体内容保持正立，不要跟着转",
        crate::iconspec::fmt_num(d)
    ))
}

fn safe_area_rule(ratio: f64) -> Option<String> {
    if ratio >= 1.0 {
        return None;
    }
    Some(format!(
        "主体收在画布中央约 {}% 的范围内，四周留出余量，避免平台裁切时切到主体",
        (ratio * 100.0).round()
    ))
}

/// 光学补偿：圆形和尖角在视觉上需要略微外扩，重心也要略微上移才显得居中。
fn optical_rule(overshoot: f64, optical_shift: f64) -> Option<String> {
    let mut parts = Vec::new();
    if overshoot > 0.0 {
        parts.push(format!(
            "圆形和尖角部分可以略微向外溢出约 {}%，这样视觉上才与直边对齐",
            (overshoot * 100.0).round()
        ));
    }
    if optical_shift.abs() > 1e-9 {
        let dir = if optical_shift > 0.0 { "上" } else { "下" };
        parts.push(format!(
            "光学重心{}移约 {}%，让主体看起来真正居中",
            dir,
            (optical_shift.abs() * 100.0).round()
        ));
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("；"))
    }
}

fn background_rule(bg: &BackgroundSpec) -> String {
    match bg {
        BackgroundSpec::Transparent => {
            "背景：不要画任何背景板或底色矩形，保持透明".to_string()
        }
        BackgroundSpec::Solid { color } => {
            format!("背景：不要画背景板，底板颜色 {} 会在后期合成时统一添加", color)
        }
        BackgroundSpec::LinearGradient { from, to, .. } => format!(
            "背景：不要画背景板，从 {} 到 {} 的渐变底板会在后期合成时统一添加",
            from, to
        ),
    }
}

fn stroke_rule(stroke: &StrokeSpec) -> String {
    match stroke {
        StrokeSpec::None => "描边：不要画外框描边，后期也不加外框".to_string(),
        StrokeSpec::Line {
            dotted,
            double,
            dash,
            ..
        } => {
            let kind = if *dotted {
                "点线"
            } else if *dash > 0.0 {
                "虚线"
            } else {
                "实线"
            };
            let ring = if *double { "同心双线" } else { "" };
            format!(
                "描边：不要画外框描边，{}{}外框会在后期合成时统一添加",
                kind, ring
            )
        }
    }
}

fn palette_rule(p: &PaletteSpec) -> String {
    let mut s = match p.mode {
        ColorMode::FullColor => "配色：自由用色，但主色控制在 3 种以内".to_string(),
        ColorMode::Monochrome => {
            "配色：单色，填充与描边统一用 currentColor，方便外部主题化换色".to_string()
        }
        ColorMode::Duotone => "配色：双色调，只用一个主色加一个辅色（可用同色系深浅变化）".to_string(),
        ColorMode::Outline => "配色：纯线稿，只描边不填色".to_string(),
        ColorMode::Flat => "配色：扁平填色，禁用渐变、阴影、高光".to_string(),
        ColorMode::Gradient => "配色：使用渐变填充，过渡要柔和不要突兀".to_string(),
    };
    if let Some(c) = &p.primary {
        s.push_str(&format!("；主色用 {}", c));
    }
    if let Some(c) = &p.secondary {
        s.push_str(&format!("；辅色用 {}", c));
    }
    s
}

fn style_rule(s: &crate::iconspec::StyleSpec) -> String {
    let style = match s.style {
        IconStyle::Flat => "扁平风格，几何化、没有立体感",
        IconStyle::Line => "线性风格，以描边为主",
        IconStyle::Filled => "面性风格，实心块面为主",
        IconStyle::Duotone => "双色风格，前景与背景两个色块构成",
        IconStyle::HandDrawn => "手绘风格，线条带抖动和笔触感",
        IconStyle::Pixel => "像素风格，边缘对齐像素格",
        IconStyle::Gradient => "渐变风格，色彩过渡柔和",
        IconStyle::ThreeD => "立体风格，有明确的受光面和投影",
        IconStyle::Glass => "玻璃拟态，半透明加高光描边",
    };
    let weight = match s.weight {
        StrokeWeight::Hairline => "极细线条",
        StrokeWeight::Thin => "细线条",
        StrokeWeight::Regular => "常规线条粗细",
        StrokeWeight::Bold => "粗线条",
        StrokeWeight::Black => "极粗线条",
    };
    let detail = match s.detail {
        DetailLevel::Minimal => "极度精简，去掉一切非必要细节，保证缩到 24px 仍能辨认",
        DetailLevel::Balanced => "细节适中，主体明确，允许少量装饰",
        DetailLevel::Detailed => "细节可以丰富一些，但仍要能缩到 48px 辨认",
    };
    let grid = match s.grid {
        GridSnap::Off => String::new(),
        GridSnap::Pt2 => "；端点对齐 2 单位网格".to_string(),
        GridSnap::Pt4 => "；端点对齐 4 单位网格".to_string(),
        GridSnap::Pt8 => "；端点对齐 8 单位网格".to_string(),
    };
    format!("风格：{}。笔触：{}。细节：{}{}", style, weight, detail, grid)
}

fn text_rule(allow_text: bool) -> &'static str {
    if allow_text {
        "文字：可以加入极短的文字，但必须保证缩到 64px 仍清晰可辨"
    } else {
        "文字：不要出现任何文字、字母或数字，纯图形表达"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::iconspec::spec::{AnimationSpec, AspectRatio, StrokeAlign};
    use crate::iconspec::IconShape;

    fn req<'a>(
        user: &'a str,
        spec: &'a IconSpec,
        refs: &'a [ReferenceItem],
        frame: Option<(u32, u32)>,
    ) -> IconPromptRequest<'a> {
        IconPromptRequest {
            user_prompt: user,
            spec,
            refs,
            frame,
        }
    }

    #[test]
    fn test_basic_prompt_contains_canvas_and_shape() {
        let spec = IconSpec::default();
        let out = compile_icon_prompt(&req("一只猫", &spec, &[], None)).unwrap();
        assert!(out.contains("一只猫"));
        assert!(out.contains("viewBox=\"0 0 512 512\""));
        assert!(out.contains("圆角正方形"), "实际: {}", out);
    }

    #[test]
    fn test_aspect_reflected_in_prompt() {
        let spec = IconSpec {
            aspect: AspectRatio::WIDE,
            base_size: 1600,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("横幅", &spec, &[], None)).unwrap();
        assert!(out.contains("viewBox=\"0 0 1600 900\""), "实际: {}", out);
        assert!(out.contains("宽高比 16:9"));
    }

    #[test]
    fn test_rotation_tells_model_to_keep_content_upright() {
        let spec = IconSpec {
            shape: IconShape::Hexagon,
            rotation: 30.0,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("蜂巢", &spec, &[], None)).unwrap();
        assert!(out.contains("正六边形"), "实际: {}", out);
        assert!(out.contains("外框形状整体旋转 30°"), "实际: {}", out);
        assert!(out.contains("主体内容保持正立"), "实际: {}", out);
    }

    #[test]
    fn test_no_rotation_rule_when_zero() {
        let spec = IconSpec::default();
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(!out.contains("外框形状整体旋转"), "实际: {}", out);
    }

    #[test]
    fn test_free_shape_still_asks_for_safe_margin() {
        let spec = IconSpec {
            shape: IconShape::Free,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("自由", &spec, &[], None)).unwrap();
        assert!(out.contains("自由形状"), "实际: {}", out);
        assert!(out.contains("安全边距"));
    }

    #[test]
    fn test_background_rules() {
        let spec = IconSpec {
            background: BackgroundSpec::Transparent,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("保持透明"), "实际: {}", out);

        let spec = IconSpec {
            background: BackgroundSpec::Solid {
                color: "#ffffff".into(),
            },
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("#ffffff"), "实际: {}", out);
        assert!(out.contains("不要画背景板"));
    }

    #[test]
    fn test_stroke_rules() {
        assert!(stroke_rule(&StrokeSpec::none()).contains("后期也不加外框"));
        assert!(stroke_rule(&StrokeSpec::solid("#000", 0.04)).contains("实线"));
        assert!(stroke_rule(&StrokeSpec::dashed("#000", 0.04)).contains("虚线"));
        assert!(stroke_rule(&StrokeSpec::dotted("#000", 0.04)).contains("点线"));
        assert!(stroke_rule(&StrokeSpec::double("#000", 0.04)).contains("同心双线"));
        // 点线 + 双线可以叠加
        assert!(stroke_rule(&StrokeSpec::double("#000", 0.04).with_dotted(true))
        .contains("点线同心双线"));
        // 描边对齐不进 prompt，它只影响合成几何
        assert!(!stroke_rule(&StrokeSpec::solid("#000", 0.04)
            .with_align(StrokeAlign::Outside))
        .contains("外对齐"));
    }

    #[test]
    fn test_palette_rules() {
        let spec = IconSpec {
            palette: PaletteSpec {
                mode: ColorMode::Monochrome,
                primary: None,
                secondary: None,
            },
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("currentColor"), "实际: {}", out);

        let spec = IconSpec {
            palette: PaletteSpec {
                mode: ColorMode::Duotone,
                primary: Some("#3B82F6".into()),
                secondary: Some("#93C5FD".into()),
            },
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("双色调"), "实际: {}", out);
        assert!(out.contains("主色用 #3B82F6"));
        assert!(out.contains("辅色用 #93C5FD"));
    }

    #[test]
    fn test_style_rules() {
        let spec = IconSpec {
            style: crate::iconspec::StyleSpec {
                style: IconStyle::Line,
                weight: StrokeWeight::Bold,
                detail: DetailLevel::Minimal,
                grid: GridSnap::Pt8,
            },
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("线性风格"), "实际: {}", out);
        assert!(out.contains("粗线条"));
        assert!(out.contains("24px 仍能辨认"));
        assert!(out.contains("端点对齐 8 单位网格"));
    }

    #[test]
    fn test_text_policy() {
        let spec = IconSpec::default();
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("不要出现任何文字"), "实际: {}", out);

        let spec = IconSpec {
            allow_text: true,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("可以加入极短的文字"), "实际: {}", out);
    }

    #[test]
    fn test_safe_area_and_optical_rules() {
        let spec = IconSpec {
            safe_area: 0.8,
            overshoot: 0.03,
            optical_shift: 0.02,
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("x", &spec, &[], None)).unwrap();
        assert!(out.contains("收在画布中央约 80%"), "实际: {}", out);
        assert!(out.contains("略微向外溢出约 3%"), "实际: {}", out);
        assert!(out.contains("光学重心上移约 2%"), "实际: {}", out);
    }

    #[test]
    fn test_animation_frame_instruction() {
        let spec = IconSpec {
            animation: AnimationSpec {
                enabled: true,
                frames: 8,
            },
            ..Default::default()
        };
        let out = compile_icon_prompt(&req("旋转", &spec, &[], Some((2, 8)))).unwrap();
        assert!(out.contains("8 帧循环动画的第 3 帧"), "实际: {}", out);
        assert!(out.contains("平滑衔接回第 1 帧"));
    }

    #[test]
    fn test_animation_disabled_ignores_frame() {
        let spec = IconSpec::default();
        let out = compile_icon_prompt(&req("x", &spec, &[], Some((2, 8)))).unwrap();
        assert!(!out.contains("帧循环动画"), "实际: {}", out);
    }

    #[test]
    fn test_references_listed_with_hints() {
        let refs = vec![
            ReferenceItem::new("logo-old").with_hint("只要配色"),
            ReferenceItem::new("icon-bee"),
            ReferenceItem::new("   "),
        ];
        let spec = IconSpec::default();
        let out = compile_icon_prompt(&req("蜜蜂", &spec, &refs, None)).unwrap();
        assert!(out.contains("- logo-old：只要配色"), "实际: {}", out);
        assert!(out.contains("- icon-bee\n"), "实际: {}", out);
        assert!(!out.contains("-    "), "实际: {}", out);
    }

    #[test]
    fn test_empty_user_prompt_rejected() {
        let spec = IconSpec::default();
        assert!(compile_icon_prompt(&req("   ", &spec, &[], None)).is_err());
    }

    #[test]
    fn test_invalid_spec_rejected() {
        let spec = IconSpec {
            base_size: 1,
            ..Default::default()
        };
        assert!(compile_icon_prompt(&req("x", &spec, &[], None)).is_err());
    }
}
