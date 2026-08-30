//! Icon Studio 的生成设定：形状、比例、描边、背景、动画，
//! 以及把这些设定套到 SVG 上的蒙版合成逻辑。
//!
//! 纯逻辑，不依赖 tokio / axum / HTTP，符合 `core ← server ← cli` 的分层约束。

pub mod mask;
pub mod prompt;
pub mod shape;
pub mod spec;

pub use mask::apply_spec;
pub use prompt::{compile_icon_prompt, IconPromptRequest, ReferenceItem};
pub use shape::{IconShape, ShapeBox};
pub use spec::{
    AnimationSpec, AspectRatio, BackgroundSpec, ColorMode, DetailLevel, GridSnap, IconSpec,
    IconStyle, LineCap, LineJoin, PaletteSpec, StrokeAlign, StrokeSpec, StrokeWeight, StyleSpec,
    MAX_FRAMES,
};

/// 蒙版 clipPath 的 id。
pub(crate) const CLIP_ID: &str = "aitmeow-shape";
/// 渐变背景的 id。
pub(crate) const BG_GRADIENT_ID: &str = "aitmeow-bg";

/// f64 转 path / 属性值字符串：四舍五入到三位小数，去掉浮点噪声。
pub(crate) fn fmt_num(v: f64) -> String {
    let r = (v * 1000.0).round() / 1000.0;
    if r == 0.0 {
        return "0".to_string();
    }
    format!("{}", r)
}

/// 属性值转义。颜色等字符串来自用户输入，带引号会破坏 SVG 结构。
pub(crate) fn escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fmt_num_trims_noise() {
        assert_eq!(fmt_num(256.0000001), "256");
        assert_eq!(fmt_num(0.0), "0");
        assert_eq!(fmt_num(-0.0), "0");
        assert_eq!(fmt_num(20.48123), "20.481");
    }

    #[test]
    fn test_escape_attr() {
        assert_eq!(escape_attr("red"), "red");
        assert_eq!(escape_attr("a\"b<c>&d"), "a&quot;b&lt;c&gt;&amp;d");
    }
}
