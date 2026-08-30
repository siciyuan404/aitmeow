//! 把生成设定套到一段 SVG 上：裁切 + 背景底板 + 描边。
//!
//! 输出结构：
//! ```text
//! <svg viewBox="0 0 W H">          外层画布，尺寸由宽高比和 base_size 决定
//!   <defs>
//!     <clipPath id="aitmeow-shape"> 形状路径
//!     <linearGradient .../>         仅渐变背景
//!   </defs>
//!   <path d="{形状}" fill="{背景}" />          背景底板，透明时不画
//!   <g clip-path="url(#aitmeow-shape)">
//!     <svg x y width height viewBox preserveAspectRatio>   ← 原始内容
//!   </g>
//!   <path d="{形状}" stroke=... />             外描边
//!   <path d="{形状内缩}" stroke=... />          双描边的内环
//! </svg>
//! ```
//!
//! 原始内容用**嵌套 `<svg>`** 承载而不是硬套 transform：嵌套 svg 自带
//! `preserveAspectRatio`，能自动把任意尺寸的原始画布缩放居中到形状框里。

use crate::error::{AitmeowError, Result};
use crate::iconspec::spec::IconSpec;
use crate::iconspec::{escape_attr, fmt_num, CLIP_ID};
use crate::svg::sanitize::sanitize;
use roxmltree::{Document, NodeType};

/// 把 `spec` 应用到 `input` 上，返回新的 SVG 字符串。
pub fn apply_spec(input: &str, spec: &IconSpec) -> Result<String> {
    spec.validate()?;

    // 先消毒：白名单过滤掉 script / foreignObject / 事件属性，输出是确定的
    // DOM 重序列化结果，后面的切片提取才可靠。
    let cleaned = sanitize(input)?;
    let (src_w, src_h) = source_size(&cleaned)?;
    let (w, h) = spec.canvas();
    let inner = extract_inner(&cleaned)?;

    // 形状框要按旋转后的包围盒收缩，否则 45° 的正方形四角会戳出画布
    let shape = spec.rotated_shape_box()?;
    let content = spec.content_box(&shape)?;
    let d = spec.shape.path(&shape);
    // 背景/描边/clipPath 共用同一份 d，transform 只能挂到元素上
    let tf = spec
        .shape
        .rotation_transform(&shape, spec.rotation)
        .map(|t| format!(" transform=\"{}\"", t))
        .unwrap_or_default();

    let mut out = String::with_capacity(cleaned.len() + 512);
    out.push_str(&format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" \
         width=\"{w}\" height=\"{h}\">\n",
        w = fmt_num(w),
        h = fmt_num(h)
    ));

    // ── defs ──
    let mut defs = String::new();
    if spec.shape.clips() {
        defs.push_str(&format!(
            "<clipPath id=\"{id}\"><path d=\"{d}\"{tf}/></clipPath>",
            id = CLIP_ID,
            d = escape_attr(&d),
            tf = tf
        ));
    }
    if let Some(g) = spec.background.defs() {
        defs.push_str(&g);
    }
    if !defs.is_empty() {
        out.push_str(&format!("<defs>{}</defs>\n", defs));
    }

    // ── 背景底板 ──
    if let Some(fill) = spec.background.fill() {
        out.push_str(&format!(
            "<path d=\"{d}\" fill=\"{fill}\"{tf}/>\n",
            d = escape_attr(&d),
            fill = escape_attr(&fill),
            tf = tf
        ));
    }

    // ── 内容 ──
    let clip = if spec.shape.clips() {
        format!(" clip-path=\"url(#{})\"", CLIP_ID)
    } else {
        String::new()
    };
    out.push_str(&format!(
        "<g{clip}><svg x=\"{x}\" y=\"{y}\" width=\"{bw}\" height=\"{bh}\" \
         viewBox=\"0 0 {sw} {sh}\" preserveAspectRatio=\"xMidYMid meet\">{inner}</svg></g>\n",
        clip = clip,
        x = fmt_num(content.x),
        y = fmt_num(content.y),
        bw = fmt_num(content.w),
        bh = fmt_num(content.h),
        sw = fmt_num(src_w),
        sh = fmt_num(src_h),
        inner = inner
    ));

    // ── 描边 ──
    if let Some(attrs) = spec.stroke.attrs(w, h) {
        out.push_str(&format!(
            "<path d=\"{d}\" {attrs}{tf}/>\n",
            d = escape_attr(&d),
            attrs = attrs,
            tf = tf
        ));
        if let Some(inner_box) = spec.inner_stroke_box(&shape) {
            let inner_d = spec.shape.path(&inner_box);
            if !inner_d.is_empty() {
                out.push_str(&format!(
                    "<path d=\"{d}\" {attrs}{tf}/>\n",
                    d = escape_attr(&inner_d),
                    attrs = attrs,
                    tf = tf
                ));
            }
        }
    }

    out.push_str("</svg>\n");
    Ok(out)
}

/// 套一层设定但不改画布：直接返回消毒后的原样内容。
///
/// 用途是前端"只看原图"的预览，以及 `spec` 非法时不想整条流程失败的兜底。
pub fn passthrough(input: &str) -> Result<String> {
    sanitize(input)
}

/// 只生成蒙版骨架（背景 + 描边，不含内容），用于前端占位预览。
pub fn skeleton(spec: &IconSpec) -> Result<String> {
    apply_spec(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"/>",
        spec,
    )
}

/// 用 usvg 量出输入 SVG 的真实尺寸，作为嵌套 svg 的 viewBox。
///
/// 比直接读 `viewBox` 属性可靠：属性缺失时 usvg 会用 width/height 或默认值兜底。
fn source_size(cleaned: &str) -> Result<(f64, f64)> {
    let tree = usvg::Tree::from_str(cleaned, &usvg::Options::default())
        .map_err(|e| AitmeowError::SvgParse(format!("无法解析输入 SVG: {}", e)))?;
    let size = tree.size();
    if size.width() <= 0.0 || size.height() <= 0.0 {
        return Err(AitmeowError::Validation(
            "输入 SVG 的画布尺寸为 0".to_string(),
        ));
    }
    Ok((size.width() as f64, size.height() as f64))
}

/// 取出根 `<svg>` 的子节点原文，丢掉根元素自身的属性。
///
/// 靠 roxmltree 的节点字节区间切片，不用正则去猜 `>` 的位置，
/// 所以属性值里带 `>` 也不会切错。
fn extract_inner(cleaned: &str) -> Result<String> {
    let doc = Document::parse(cleaned)
        .map_err(|e| AitmeowError::SvgParse(format!("提取内容失败: {}", e)))?;

    let root = doc
        .root()
        .children()
        .find(|n| matches!(n.node_type(), NodeType::Element))
        .ok_or_else(|| AitmeowError::SvgParse("缺少根 <svg> 元素".to_string()))?;

    let mut start: Option<usize> = None;
    let mut end: Option<usize> = None;
    for child in root.children() {
        let r = child.range();
        start = Some(start.map_or(r.start, |s| s.min(r.start)));
        end = Some(end.map_or(r.end, |e| e.max(r.end)));
    }

    match (start, end) {
        (Some(s), Some(e)) if e > s => Ok(cleaned[s..e].to_string()),
        _ => Ok(String::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::iconspec::spec::{AspectRatio, BackgroundSpec, StrokeAlign, StrokeSpec};
    use crate::iconspec::IconShape;

    const SRC: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>"#;

    fn spec_of(shape: IconShape) -> IconSpec {
        IconSpec {
            shape,
            ..Default::default()
        }
    }

    #[test]
    fn test_output_is_parseable() {
        let out = apply_spec(SRC, &spec_of(IconShape::Circle)).unwrap();
        // 输出必须能被 usvg 重新解析，否则渲染端会炸
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_canvas_size_from_aspect() {
        let spec = IconSpec {
            shape: IconShape::RoundedSquare { radius: 0.2 },
            aspect: AspectRatio::WIDE,
            base_size: 1600,
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("viewBox=\"0 0 1600 900\""), "实际: {}", out);
    }

    #[test]
    fn test_content_wrapped_in_nested_svg() {
        let out = apply_spec(SRC, &spec_of(IconShape::Circle)).unwrap();
        assert!(out.contains("<svg x=\"0\" y=\"0\" width=\"512\" height=\"512\""));
        assert!(out.contains("viewBox=\"0 0 100 100\""), "实际: {}", out);
        assert!(out.contains("preserveAspectRatio=\"xMidYMid meet\""));
    }

    #[test]
    fn test_original_content_preserved_verbatim() {
        let out = apply_spec(SRC, &spec_of(IconShape::Circle)).unwrap();
        assert!(out.contains(r#"r="40" fill="red""#), "实际: {}", out);
    }

    #[test]
    fn test_clip_path_emitted_and_referenced() {
        let out = apply_spec(SRC, &spec_of(IconShape::Hexagon)).unwrap();
        assert!(out.contains("clipPath id=\"aitmeow-shape\""), "实际: {}", out);
        assert!(out.contains("clip-path=\"url(#aitmeow-shape)\""));
    }

    #[test]
    fn test_free_shape_has_no_clip() {
        let out = apply_spec(SRC, &spec_of(IconShape::Free)).unwrap();
        assert!(!out.contains("clipPath"), "实际: {}", out);
        assert!(!out.contains("clip-path"));
    }

    #[test]
    fn test_transparent_background_has_no_plate() {
        let out = apply_spec(SRC, &spec_of(IconShape::Circle)).unwrap();
        // 只有 defs 里的 clipPath path，没有底板 path
        assert_eq!(out.matches("<path").count(), 1, "实际: {}", out);
    }

    #[test]
    fn test_solid_background_adds_plate() {
        let spec = IconSpec {
            shape: IconShape::Circle,
            background: BackgroundSpec::Solid {
                color: "#ffffff".into(),
            },
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("fill=\"#ffffff\""), "实际: {}", out);
        assert_eq!(out.matches("<path").count(), 2);
    }

    #[test]
    fn test_gradient_background_emits_defs() {
        let spec = IconSpec {
            shape: IconShape::Circle,
            background: BackgroundSpec::LinearGradient {
                from: "#fff".into(),
                to: "#000".into(),
                angle: 90.0,
            },
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("<linearGradient id=\"aitmeow-bg\""), "实际: {}", out);
        assert!(out.contains("fill=\"url(#aitmeow-bg)\""));
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_stroke_emits_one_path_for_single_line() {
        let spec = IconSpec {
            shape: IconShape::Circle,
            stroke: StrokeSpec::solid("#000000", 0.04),
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert_eq!(out.matches("stroke=\"#000000\"").count(), 1, "实际: {}", out);
        // 线宽 0.04 * 512 = 20.48
        assert!(out.contains("stroke-width=\"20.48\""), "实际: {}", out);
    }

    #[test]
    fn test_double_stroke_emits_two_concentric_paths() {
        let spec = IconSpec {
            shape: IconShape::Circle,
            stroke: StrokeSpec::double("#123456", 0.04).with_gap(0.02),
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert_eq!(out.matches("stroke=\"#123456\"").count(), 2, "实际: {}", out);
        // 两条 path 的 d 必须不同（内环更小）
        let ds: Vec<&str> = out
            .lines()
            .filter(|l| l.contains("stroke=\"#123456\""))
            .collect();
        assert_ne!(ds[0], ds[1]);
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_stroke_align_moves_the_ring_not_the_content() {
        // 三种对齐下可见内容区一样大，变的是描边环套在哪
        let ring_at = |align: StrokeAlign| -> String {
            let spec = IconSpec {
                shape: IconShape::Circle,
                stroke: StrokeSpec::solid("#000", 0.1).with_align(align),
                ..Default::default()
            };
            let out = apply_spec(SRC, &spec).unwrap();
            out.lines()
                .find(|l| l.contains("stroke=\"#000\""))
                .unwrap()
                .to_string()
        };
        assert!(
            ring_at(StrokeAlign::Inside).contains("M 0 256"),
            "{}",
            ring_at(StrokeAlign::Inside)
        );
        assert!(
            ring_at(StrokeAlign::Center).contains("M 25.6 256"),
            "{}",
            ring_at(StrokeAlign::Center)
        );
        assert!(
            ring_at(StrokeAlign::Outside).contains("M 51.2 256"),
            "{}",
            ring_at(StrokeAlign::Outside)
        );
    }

    #[test]
    fn test_stroke_inside_shrinks_content_placement() {
        let spec = IconSpec {
            shape: IconShape::Circle,
            stroke: StrokeSpec::solid("#000", 0.1),
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        // Inside：内容让出一整个线宽，描边不会压住内容
        assert!(out.contains("x=\"51.2\" y=\"51.2\" width=\"409.6\""), "实际: {}", out);
    }

    #[test]
    fn test_rotation_emits_transform_on_shape_paths() {
        let spec = IconSpec {
            shape: IconShape::Square,
            rotation: 45.0,
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("transform=\"rotate(45 256 256)\""), "实际: {}", out);
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_no_transform_when_rotation_is_zero() {
        let out = apply_spec(SRC, &spec_of(IconShape::Square)).unwrap();
        assert!(!out.contains("transform="), "实际: {}", out);
    }

    #[test]
    fn test_safe_area_shrinks_placement() {
        let spec = IconSpec {
            safe_area: 0.8,
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("x=\"51.2\" y=\"51.2\" width=\"409.6\""), "实际: {}", out);
    }

    #[test]
    fn test_optical_shift_moves_content_up() {
        let spec = IconSpec {
            optical_shift: 0.05,
            ..Default::default()
        };
        let out = apply_spec(SRC, &spec).unwrap();
        assert!(out.contains("y=\"-25.6\""), "实际: {}", out);
    }

    #[test]
    fn test_script_is_stripped_by_sanitize() {
        let evil = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10"/></svg>"#;
        let out = apply_spec(evil, &spec_of(IconShape::Circle)).unwrap();
        assert!(!out.contains("script"), "实际: {}", out);
    }

    #[test]
    fn test_empty_svg_still_produces_valid_output() {
        let empty = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>"#;
        let out = apply_spec(empty, &spec_of(IconShape::Square)).unwrap();
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_non_svg_root_is_rejected() {
        assert!(apply_spec("<div>hello</div>", &spec_of(IconShape::Circle)).is_err());
    }

    #[test]
    fn test_invalid_spec_is_rejected_before_touching_input() {
        let spec = IconSpec {
            inset: 0.44,
            stroke: StrokeSpec::solid("#000", 0.3),
            ..Default::default()
        };
        assert!(apply_spec(SRC, &spec).is_err());
    }

    #[test]
    fn test_skeleton_has_no_content_but_valid() {
        let out = skeleton(&spec_of(IconShape::Octagon)).unwrap();
        assert!(out.contains("<path"), "实际: {}", out);
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }

    #[test]
    fn test_passthrough_only_sanitizes() {
        let out = passthrough(SRC).unwrap();
        assert!(out.contains("viewBox=\"0 0 100 100\""));
        assert!(!out.contains("aitmeow-shape"));
    }

    #[test]
    fn test_attribute_value_with_gt_does_not_break_extraction() {
        // 属性值里带 >，正则切分会出错，字节区间切片不会
        let tricky = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" data-x="a>b"><rect width="10" height="10" fill="red"/></svg>"#;
        let out = apply_spec(tricky, &spec_of(IconShape::Square)).unwrap();
        assert!(out.contains(r#"fill="red""#), "实际: {}", out);
        usvg::Tree::from_str(&out, &usvg::Options::default()).unwrap();
    }
}
