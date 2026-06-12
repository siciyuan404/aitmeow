use crate::error::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub background_color: Option<String>,
    pub format: OutputFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Png,
    Svg,
}

impl Default for RenderOptions {
    fn default() -> Self {
        Self {
            width: None,
            height: None,
            background_color: None,
            format: OutputFormat::Png,
        }
    }
}

pub fn render_svg(input: &str, opts: &RenderOptions) -> Result<Vec<u8>> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(input, &opt)
        .map_err(|e| crate::error::AitmeowError::Render(format!("Parse error: {}", e)))?;

    match opts.format {
        OutputFormat::Svg => Ok(input.as_bytes().to_vec()),
        OutputFormat::Png => {
            let size = tree.size();
            let width = opts
                .width
                .unwrap_or_else(|| size.width().ceil() as u32)
                .max(1);
            let height = opts
                .height
                .unwrap_or_else(|| size.height().ceil() as u32)
                .max(1);

            let mut pixmap =
                tiny_skia::Pixmap::new(width, height)
                    .ok_or_else(|| crate::error::AitmeowError::Render(
                        "Failed to create pixmap".to_string(),
                    ))?;

            if let Some(ref bg) = opts.background_color {
                let color = parse_color(bg).ok_or_else(|| {
                    crate::error::AitmeowError::Render(format!("Invalid background color: {}", bg))
                })?;
                pixmap.fill(color);
            }

            let transform = tiny_skia::Transform::from_scale(
                width as f32 / size.width(),
                height as f32 / size.height(),
            );
            resvg::render(&tree, transform, &mut pixmap.as_mut());

            let png_data = pixmap
                .encode_png()
                .map_err(|e| crate::error::AitmeowError::Render(format!("PNG encode error: {}", e)))?;

            Ok(png_data)
        }
    }
}

fn parse_color(hex: &str) -> Option<tiny_skia::Color> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
    Some(tiny_skia::Color::from_rgba8(r, g, b, 255))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_png() {
        let svg = r#"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="blue"/></svg>"#;
        let result = render_svg(svg, &RenderOptions::default()).unwrap();
        assert!(!result.is_empty());
        assert_eq!(&result[1..4], b"PNG");
    }

    #[test]
    fn test_render_with_size() {
        let svg = r#"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30"/></svg>"#;
        let result = render_svg(
            svg,
            &RenderOptions {
                width: Some(200),
                height: Some(200),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(!result.is_empty());
    }
}
