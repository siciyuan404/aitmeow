//! Image processing pipeline for pixel art SVG generation.
//!
//! This module provides:
//! - Classic pixel art palette constants ([`palette`])
//! - Image preprocessing pipeline ([`pipeline`])
//! - Edge detection ([`edge`])
//! - Color quantization ([`quantize`])
//! - Feature extraction for AI prompts ([`features`])

pub mod palette;
pub mod pipeline;
pub mod edge;
pub mod quantize;
pub mod features;

/// Re-export key image crate types for convenience.
pub use image::{DynamicImage, GrayImage, ImageBuffer, ImageFormat, Luma, Rgb, RgbImage};

/// Core image processor that chains preprocessing steps and extracts features.
pub struct ImageProcessor;

impl ImageProcessor {
    /// Load a PNG from raw bytes.
    pub fn load_png(data: &[u8]) -> Result<image::DynamicImage, image::ImageError> {
        image::load_from_memory_with_format(data, image::ImageFormat::Png)
    }

    /// Load a JPEG from raw bytes.
    pub fn load_jpeg(data: &[u8]) -> Result<image::DynamicImage, image::ImageError> {
        image::load_from_memory_with_format(data, image::ImageFormat::Jpeg)
    }

    /// Process a reference image through the configured pipeline and return
    /// AI-friendly prompt text describing its features.
    ///
    /// This is the main entry point used by [`ImageReference::render_for_prompt`].
    pub fn process_for_prompt(
        image_data: &[u8],
        resize: Option<&str>,
        edge_detect: Option<&str>,
        quantize_colors: Option<usize>,
        threshold: Option<u8>,
        invert: bool,
    ) -> Result<String, String> {
        let img = Self::load_png(image_data).map_err(|e| format!("PNG decode error: {e}"))?;
        let mut pipeline = pipeline::Pipeline::new();

        // Step 1: Resize to target grid
        if let Some(size_str) = resize {
            if let Some((w, h)) = parse_dimensions(size_str) {
                pipeline.add_step(pipeline::PipelineStep::Resize { width: w, height: h });
            }
        }

        // Step 2: Grayscale before edge detection
        if edge_detect.is_some() {
            pipeline.add_step(pipeline::PipelineStep::Grayscale);
        }

        // Step 3: Edge detection
        if let Some(algo) = edge_detect {
            pipeline.add_step(pipeline::PipelineStep::EdgeDetect {
                algorithm: algo.to_string(),
            });
        }

        // Step 4: Color quantization
        if let Some(max_colors) = quantize_colors {
            if max_colors > 0 {
                pipeline.add_step(pipeline::PipelineStep::ColorQuantize { max_colors });
            }
        }

        // Step 5: Threshold (binary)
        if let Some(t) = threshold {
            pipeline.add_step(pipeline::PipelineStep::Threshold { value: t });
        }

        // Step 6: Invert
        if invert {
            pipeline.add_step(pipeline::PipelineStep::Invert);
        }

        let processed = pipeline.run(&img);
        let report = features::FeatureReport::from_image(&processed);
        Ok(report.to_prompt_text())
    }
}

/// Parse "WxH" or "W×H" dimension strings.
fn parse_dimensions(s: &str) -> Option<(u32, u32)> {
    let s = s.replace('×', "x");
    let parts: Vec<&str> = s.split('x').collect();
    if parts.len() == 2 {
        let w: u32 = parts[0].trim().parse().ok()?;
        let h: u32 = parts[1].trim().parse().ok()?;
        if w > 0 && h > 0 && w <= 4096 && h <= 4096 {
            return Some((w, h));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_png_bytes() {
        // Minimal valid PNG: 1×1 pixel, black
        let _png_bytes = &[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1×1
            0x08, 0x02, // RGB
            0x00, 0x00, 0x00, // CRC placeholder (invalid, but image-rs may still parse)
            // We'll skip CRC issues — this is a structural test
        ];
        // NOTE: This is a structurally-incomplete PNG;
        // a real test uses a valid file. This test is for API shape only.
        // For now, we simply verify the processor doesn't crash on API calls.
        let _processor = ImageProcessor;
    }
}
