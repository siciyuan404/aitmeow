use serde::{Deserialize, Serialize};

/// Pixel art palette constants (re-exported from image module).
use crate::image::palette;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TemplateOption {
    // ── Generic types ──
    Color {
        key: String,
        label: String,
        #[serde(default)]
        default: String,
    },
    Select {
        key: String,
        label: String,
        options: Vec<String>,
        #[serde(default)]
        default: String,
    },
    Text {
        key: String,
        label: String,
        #[serde(default)]
        default: String,
        #[serde(default)]
        placeholder: String,
    },
    Range {
        key: String,
        label: String,
        #[serde(default = "default_min")]
        min: f64,
        #[serde(default = "default_max")]
        max: f64,
        #[serde(default = "default_value")]
        default: f64,
        #[serde(default = "default_step")]
        step: f64,
    },

    // ── Pixel art types ──

    /// Pixel canvas size with presets (16×16, 32×32, 64×64, 125×125, ...).
    PixelGrid {
        key: String,
        label: String,
        #[serde(default = "default_pixel_grid_presets")]
        presets: Vec<String>,
        #[serde(default)]
        allow_custom: bool,
        #[serde(default = "default_pixel_grid")]
        default: String,
    },

    /// Pixel color palette with classic presets (Gameboy, PICO-8, NES, ...).
    PixelPalette {
        key: String,
        label: String,
        #[serde(default = "default_palette_preset")]
        preset: String,
        #[serde(default)]
        colors: Vec<String>,
        #[serde(default = "default_pixel_palette")]
        default: String,
    },

    /// Reference image with preprocessing pipeline (PNG bytes → feature extraction).
    ImageReference {
        key: String,
        label: String,
        #[serde(default)]
        resize: Option<String>,
        #[serde(default)]
        edge_detect: Option<String>,
        #[serde(default)]
        quantize_colors: Option<usize>,
        #[serde(default)]
        threshold: Option<u8>,
        #[serde(default)]
        invert: bool,
        /// Runtime PNG data (not serialized to TOML).
        #[serde(skip, default)]
        image_data: Option<Vec<u8>>,
    },

    /// Controlled randomness with optional seed for reproducibility.
    RandomSeed {
        key: String,
        label: String,
        #[serde(default)]
        seed: Option<u64>,
        #[serde(default = "default_random_strength")]
        strength: f64,
    },

    /// Stroke / line rendering style (crisp pixel, hand-drawn, sketch).
    StrokeStyle {
        key: String,
        label: String,
        #[serde(default = "default_stroke_style")]
        style: String,
        #[serde(default)]
        jitter: f64,
        #[serde(default = "default_line_weight")]
        line_weight: usize,
    },

    /// Dithering algorithm for color transitions.
    DitherMode {
        key: String,
        label: String,
        #[serde(default = "default_dither_algorithm")]
        algorithm: String,
        #[serde(default = "default_full")]
        strength: f64,
    },

    /// Pixel scale multiplier (1x, 2x, 4x, 8x).
    PixelScale {
        key: String,
        label: String,
        #[serde(default = "default_scale")]
        scale: usize,
        #[serde(default = "default_scale")]
        default: usize,
    },
}

// ── Default functions ──

fn default_min() -> f64 { 0.0 }
fn default_max() -> f64 { 100.0 }
fn default_value() -> f64 { 50.0 }
fn default_step() -> f64 { 1.0 }
fn default_full() -> f64 { 1.0 }

fn default_pixel_grid_presets() -> Vec<String> {
    vec![
        "16x16".into(), "24x24".into(), "32x32".into(), "48x48".into(),
        "64x64".into(), "125x125".into(), "128x128".into(), "256x224".into(),
    ]
}
fn default_pixel_grid() -> String { "32x32".into() }
fn default_palette_preset() -> String { "gameboy".into() }
fn default_pixel_palette() -> String { "gameboy".into() }
fn default_random_strength() -> f64 { 0.3 }
fn default_stroke_style() -> String { "crisp".into() }
fn default_line_weight() -> usize { 1 }
fn default_dither_algorithm() -> String { "none".into() }
fn default_scale() -> usize { 4 }

impl TemplateOption {
    pub fn key(&self) -> &str {
        match self {
            TemplateOption::Color { key, .. }
            | TemplateOption::Select { key, .. }
            | TemplateOption::Text { key, .. }
            | TemplateOption::Range { key, .. }
            | TemplateOption::PixelGrid { key, .. }
            | TemplateOption::PixelPalette { key, .. }
            | TemplateOption::ImageReference { key, .. }
            | TemplateOption::RandomSeed { key, .. }
            | TemplateOption::StrokeStyle { key, .. }
            | TemplateOption::DitherMode { key, .. }
            | TemplateOption::PixelScale { key, .. } => key,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            TemplateOption::Color { label, .. }
            | TemplateOption::Select { label, .. }
            | TemplateOption::Text { label, .. }
            | TemplateOption::Range { label, .. }
            | TemplateOption::PixelGrid { label, .. }
            | TemplateOption::PixelPalette { label, .. }
            | TemplateOption::ImageReference { label, .. }
            | TemplateOption::RandomSeed { label, .. }
            | TemplateOption::StrokeStyle { label, .. }
            | TemplateOption::DitherMode { label, .. }
            | TemplateOption::PixelScale { label, .. } => label,
        }
    }

    pub fn default_value(&self) -> String {
        match self {
            TemplateOption::Color { default, .. }
            | TemplateOption::Select { default, .. }
            | TemplateOption::Text { default, .. }
            | TemplateOption::PixelGrid { default, .. }
            | TemplateOption::PixelPalette { default, .. } => default.clone(),
            TemplateOption::Range { default, .. } => default.to_string(),
            TemplateOption::RandomSeed { seed, .. } => {
                seed.map(|s| s.to_string()).unwrap_or_else(|| "random".into())
            }
            TemplateOption::StrokeStyle { style, .. } => style.clone(),
            TemplateOption::DitherMode { algorithm, .. } => algorithm.clone(),
            TemplateOption::PixelScale { scale, .. } => scale.to_string(),
            TemplateOption::ImageReference { .. } => String::new(),
        }
    }

    /// Render this option's value into AI-friendly prompt text.
    ///
    /// Unlike `default_value()`, this produces rich, contextual text
    /// designed to guide an LLM in generating high-quality SVG output.
    /// Each pixel art type injects domain-specific SVG rendering hints.
    pub fn render_for_prompt(&self, value: &str) -> String {
        match self {
            // ── Generic types: plain value pass-through ──
            TemplateOption::Color { .. } => {
                let hex = value.trim_start_matches('#');
                format!("#{hex}")
            }
            TemplateOption::Select { .. }
            | TemplateOption::Text { .. } => value.to_string(),
            TemplateOption::Range { default, min, max, .. } => {
                let v: f64 = value.parse().unwrap_or(*default);
                format!("{} (range {}-{})", v, min, max)
            }

            // ── Pixel art types: rich AI-friendly output ──

            TemplateOption::PixelGrid { .. } => {
                let grid = if value.is_empty() { "32x32" } else { value };
                let parts: Vec<&str> = grid.split('x').collect();
                let w = parts.first().unwrap_or(&"32");
                let h = parts.get(1).unwrap_or(&"32");
                format!(
                    "canvas: {w}×{h} pixel grid. \
                     Render each pixel as a <rect> element with width=1 height=1 \
                     at integer grid coordinates. \
                     Set SVG viewBox='0 0 {w} {h}' with shape-rendering='crispEdges'. \
                     No antialiasing, no sub-pixel placement, no gradients or alpha blending."
                )
            }

            TemplateOption::PixelPalette { .. } => {
                let effective_preset = if !value.is_empty() { value } else { "gameboy" };
                let palette_colors = palette::get_palette(effective_preset);
                match palette_colors {
                    Some(colors) => {
                        let names: Vec<String> = colors.iter().enumerate().map(|(i, c)| {
                            format!("{} (color {})", c, i + 1)
                        }).collect();
                        format!(
                            "color palette: {} ({} colors): {}. \
                             Use ONLY these exact hex colors. No color mixing, \
                             no transparency, no gradients. Enforce hard color boundaries — \
                             each pixel must resolve to exactly one palette color. \
                             Dithering is allowed between palette colors ONLY.",
                            effective_preset,
                            colors.len(),
                            names.join(", ")
                        )
                    }
                    None => {
                        format!("color palette: custom: {}. Use these exact colors.", value)
                    }
                }
            }

            TemplateOption::ImageReference {
                resize,
                edge_detect,
                quantize_colors,
                threshold,
                invert,
                image_data,
                ..
            } => {
                // If image data is available, run the preprocessing pipeline
                // and inject the feature report into the prompt.
                if let Some(data) = image_data {
                    if !data.is_empty() {
                        match crate::image::ImageProcessor::process_for_prompt(
                            data,
                            resize.as_deref(),
                            edge_detect.as_deref(),
                            *quantize_colors,
                            *threshold,
                            *invert,
                        ) {
                            Ok(feature_text) => return feature_text,
                            Err(e) => {
                                return format!(
                                    "reference image: [feature extraction failed: {e}]"
                                );
                            }
                        }
                    }
                }
                // If value already contains a feature report (e.g., from session layer), use it.
                if value.contains("Reference image analysis") {
                    value.to_string()
                } else {
                    "reference image: [pending feature extraction — \
                     image will be analyzed for edges, shapes, and color distribution]"
                        .to_string()
                }
            }

            TemplateOption::RandomSeed { seed, strength, .. } => {
                match seed {
                    Some(s) => format!(
                        "randomization: seed={s}, strength={strength:.1}. \
                         Apply controlled variation to pixel placement \
                         (±{}px jitter), dither pattern offsets, and path \
                         endpoint irregularities. Output must be reproducible \
                         for the same seed value.",
                        (strength * 2.0).ceil() as usize
                    ),
                    None => format!(
                        "randomization: true random, strength={strength:.1}. \
                         Maximum organic variation in pixel placement, \
                         dither offsets, and stroke rendering."
                    ),
                }
            }

            TemplateOption::StrokeStyle { jitter, line_weight, .. } => {
                let effective_style = if !value.is_empty() { value } else { "crisp" };
                match effective_style {
                    "handdrawn" | "sketch" => format!(
                        "stroke: {effective_style} style, jitter={jitter:.1}, weight={line_weight}px. \
                         Use <path> elements with organic, irregular endpoints. \
                         Vary stroke endpoints ±{}px randomly. \
                         Avoid perfectly straight edges — introduce micro-variations \
                         to simulate hand drawing.",
                        (jitter * 2.0).ceil() as usize
                    ),
                    _ => format!(
                        "stroke: crisp pixel-perfect lines, weight={line_weight}px. \
                         Use <rect> elements with shape-rendering='crispEdges'. \
                         Straight edges, integer coordinates, no stroke variations."
                    ),
                }
            }

            TemplateOption::DitherMode { strength, .. } => {
                let effective_algo = if !value.is_empty() { value } else { "none" };
                match effective_algo {
                    "bayer2x2" => format!(
                        "dithering: Bayer 2×2 ordered dither at {:.0}% strength. \
                         Use 2×2 checkerboard patterns to blend between palette colors. \
                         Apply the threshold matrix: [[1,3],[4,2]]/5.",
                        strength * 100.0
                    ),
                    "bayer4x4" => format!(
                        "dithering: Bayer 4×4 ordered dither at {:.0}% strength. \
                         Use the 4×4 Bayer threshold matrix for color transitions. \
                         Creates structured, grid-like dither patterns.",
                        strength * 100.0
                    ),
                    "floyd-steinberg" => format!(
                        "dithering: Floyd-Steinberg error diffusion at {:.0}% strength. \
                         Distribute quantization error to neighboring pixels \
                         (right +7/16, bottom-left +3/16, bottom +5/16, bottom-right +1/16) \
                         for natural-looking color transitions.",
                        strength * 100.0
                    ),
                    _ => format!(
                        "dithering: none — pure palette colors with hard edges. \
                         No color blending between adjacent pixels."
                    ),
                }
            }

            TemplateOption::PixelScale { .. } => {
                let s: usize = value.parse().unwrap_or(4);
                format!(
                    "pixel scale: {s}x magnification. Each logical pixel occupies \
                     a {s}×{s} block in viewport units. Set viewBox dimensions to \
                     grid_width×{s} × grid_height×{s}. \
                     Use nearest-neighbor upscaling (image-rendering: pixelated)."
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::image;

    // ── Generic type tests ──

    #[test]
    fn test_color_key_label_default() {
        let opt = TemplateOption::Color {
            key: "c".into(),
            label: "Color".into(),
            default: "#ff0000".into(),
        };
        assert_eq!(opt.key(), "c");
        assert_eq!(opt.label(), "Color");
        assert_eq!(opt.default_value(), "#ff0000");
    }

    #[test]
    fn test_render_color_for_prompt() {
        let opt = TemplateOption::Color {
            key: "c".into(),
            label: "Color".into(),
            default: "#ff0000".into(),
        };
        let out = opt.render_for_prompt("#00ff00");
        assert_eq!(out, "#00ff00");
    }

    // ── Pixel type tests ──

    #[test]
    fn test_pixel_grid_defaults() {
        let opt = TemplateOption::PixelGrid {
            key: "grid".into(),
            label: "Grid".into(),
            presets: default_pixel_grid_presets(),
            allow_custom: false,
            default: "32x32".into(),
        };
        assert_eq!(opt.key(), "grid");
        assert_eq!(opt.label(), "Grid");
        assert_eq!(opt.default_value(), "32x32");
    }

    #[test]
    fn test_render_pixel_grid_32x32() {
        let opt = TemplateOption::PixelGrid {
            key: "g".into(),
            label: "G".into(),
            presets: vec![],
            allow_custom: true,
            default: "32x32".into(),
        };
        let out = opt.render_for_prompt("32x32");
        assert!(out.contains("32×32"));
        assert!(out.contains("crispEdges"));
        assert!(out.contains("viewBox"));
    }

    #[test]
    fn test_render_pixel_grid_125x125() {
        let opt = TemplateOption::PixelGrid {
            key: "g".into(),
            label: "G".into(),
            presets: vec![],
            allow_custom: true,
            default: "125x125".into(),
        };
        let out = opt.render_for_prompt("125x125");
        assert!(out.contains("125×125"));
    }

    #[test]
    fn test_pixel_palette_gameboy() {
        let opt = TemplateOption::PixelPalette {
            key: "pal".into(),
            label: "Palette".into(),
            preset: "gameboy".into(),
            colors: vec![],
            default: "gameboy".into(),
        };
        assert_eq!(opt.default_value(), "gameboy");
        let out = opt.render_for_prompt("gameboy");
        assert!(out.contains("gameboy"));
        assert!(out.contains("4 colors"));
        assert!(out.contains("#0f380f"));
    }

    #[test]
    fn test_render_random_seed() {
        let opt = TemplateOption::RandomSeed {
            key: "seed".into(),
            label: "Seed".into(),
            seed: Some(42),
            strength: 0.5,
        };
        let out = opt.render_for_prompt("42");
        assert!(out.contains("seed=42"));
        assert!(out.contains("reproducible"));
    }

    #[test]
    fn test_render_random_true_random() {
        let opt = TemplateOption::RandomSeed {
            key: "seed".into(),
            label: "Seed".into(),
            seed: None,
            strength: 0.9,
        };
        assert_eq!(opt.default_value(), "random");
        let out = opt.render_for_prompt("");
        assert!(out.contains("true random"));
    }

    #[test]
    fn test_render_stroke_handdrawn() {
        let opt = TemplateOption::StrokeStyle {
            key: "stroke".into(),
            label: "Stroke".into(),
            style: "handdrawn".into(),
            jitter: 0.4,
            line_weight: 2,
        };
        let out = opt.render_for_prompt("handdrawn");
        assert!(out.contains("handdrawn"));
        assert!(out.contains("jitter=0.4"));
        assert!(out.contains("path"));
    }

    #[test]
    fn test_render_stroke_crisp() {
        let opt = TemplateOption::StrokeStyle {
            key: "stroke".into(),
            label: "Stroke".into(),
            style: "crisp".into(),
            jitter: 0.0,
            line_weight: 1,
        };
        let out = opt.render_for_prompt("crisp");
        assert!(out.contains("crispEdges"));
        assert!(!out.contains("jitter"));
    }

    #[test]
    fn test_render_dither_bayer2x2() {
        let opt = TemplateOption::DitherMode {
            key: "dith".into(),
            label: "Dither".into(),
            algorithm: "bayer2x2".into(),
            strength: 1.0,
        };
        let out = opt.render_for_prompt("bayer2x2");
        assert!(out.contains("Bayer 2×2"));
        assert!(out.contains("checkerboard"));
    }

    #[test]
    fn test_render_dither_floyd_steinberg() {
        let opt = TemplateOption::DitherMode {
            key: "dith".into(),
            label: "Dither".into(),
            algorithm: "floyd-steinberg".into(),
            strength: 0.8,
        };
        let out = opt.render_for_prompt("floyd-steinberg");
        assert!(out.contains("Floyd-Steinberg"));
        assert!(out.contains("error diffusion"));
    }

    #[test]
    fn test_render_dither_none() {
        let opt = TemplateOption::DitherMode {
            key: "dith".into(),
            label: "Dither".into(),
            algorithm: "none".into(),
            strength: 0.0,
        };
        let out = opt.render_for_prompt("none");
        assert!(out.contains("pure palette colors"));
    }

    #[test]
    fn test_render_pixel_scale_4x() {
        let opt = TemplateOption::PixelScale {
            key: "scale".into(),
            label: "Scale".into(),
            scale: 4,
            default: 4,
        };
        let out = opt.render_for_prompt("4");
        assert!(out.contains("4x"));
        assert!(out.contains("pixelated"));
    }

    #[test]
    fn test_image_reference_with_real_pipeline() {
        // Create a simple 8×8 PNG: white square on black background
        let img = image::ImageBuffer::from_fn(8, 8, |x, y| {
            if x >= 2 && x < 6 && y >= 2 && y < 6 {
                image::Rgb([255u8, 255, 255])
            } else {
                image::Rgb([0u8, 0, 0])
            }
        });
        let mut png_bytes = Vec::new();
        image::DynamicImage::ImageRgb8(img).write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png).unwrap();

        let opt = TemplateOption::ImageReference {
            key: "ref".into(),
            label: "Reference".into(),
            resize: Some("8x8".into()),
            edge_detect: None,
            quantize_colors: None,
            threshold: None,
            invert: false,
            image_data: Some(png_bytes),
        };

        let out = opt.render_for_prompt("");
        // Should contain feature report from real pipeline
        assert!(out.contains("Reference image analysis"));
        assert!(out.contains("8×8 grid"));
        assert!(out.contains("edge pixels"));
        assert!(out.contains("shape regions"));
    }

    #[test]
    fn test_image_reference_with_edge_detection() {
        let img = image::ImageBuffer::from_fn(16, 16, |x, _y| {
            if x < 8 { image::Rgb([255u8, 255, 255]) } else { image::Rgb([0u8, 0, 0]) }
        });
        let mut png_bytes = Vec::new();
        image::DynamicImage::ImageRgb8(img).write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png).unwrap();

        let opt = TemplateOption::ImageReference {
            key: "ref".into(),
            label: "Reference".into(),
            resize: Some("16x16".into()),
            edge_detect: Some("sobel".into()),
            quantize_colors: None,
            threshold: None,
            invert: false,
            image_data: Some(png_bytes),
        };

        let out = opt.render_for_prompt("");
        assert!(out.contains("Reference image analysis"));
        assert!(out.contains("16×16 grid"));
        // Edge detection should find the vertical boundary
        assert!(out.contains("edge pixels"));
    }

    #[test]
    fn test_image_reference_no_data_returns_pending() {
        let opt = TemplateOption::ImageReference {
            key: "ref".into(),
            label: "Reference".into(),
            resize: None,
            edge_detect: None,
            quantize_colors: None,
            threshold: None,
            invert: false,
            image_data: None,
        };
        let out = opt.render_for_prompt("");
        assert!(out.contains("pending feature extraction"));
    }

    #[test]
    fn test_image_reference_with_features() {
        let opt = TemplateOption::ImageReference {
            key: "ref".into(),
            label: "Reference".into(),
            resize: None,
            edge_detect: None,
            quantize_colors: None,
            threshold: None,
            invert: false,
            image_data: None,
        };
        let features = "Reference image analysis (8×8 grid):\n - 12 edge pixels detected";
        let out = opt.render_for_prompt(features);
        assert_eq!(out, features);
    }

    #[test]
    fn test_serde_tag_snake_case() {
        // Verify that the serde tag name uses snake_case (not lowercase)
        let opt = TemplateOption::PixelGrid {
            key: "g".into(),
            label: "G".into(),
            presets: vec![],
            allow_custom: false,
            default: "32x32".into(),
        };
        let json = serde_json::to_string(&opt).unwrap();
        assert!(json.contains("\"type\":\"pixel_grid\""));
    }

    #[test]
    fn test_render_for_prompt_color_strips_hash() {
        let opt = TemplateOption::Color {
            key: "c".into(),
            label: "C".into(),
            default: "#000".into(),
        };
        assert_eq!(opt.render_for_prompt("#abc123"), "#abc123");
        assert_eq!(opt.render_for_prompt("abc123"), "#abc123");
    }
}
