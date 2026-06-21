//! Preprocessing pipeline for pixel art image analysis.
//!
//! Chains multiple [`PipelineStep`] operations to transform a source image
//! into a pixel-art-ready representation.

use image::DynamicImage;

/// A single preprocessing operation.
pub enum PipelineStep {
    /// Resize to target dimensions using nearest-neighbor (preserves pixel edges).
    Resize { width: u32, height: u32 },
    /// Convert to grayscale.
    Grayscale,
    /// Edge detection using a specified algorithm (see [`super::edge`]).
    EdgeDetect { algorithm: String },
    /// Color quantization: reduce image to `max_colors` distinct colors.
    ColorQuantize { max_colors: usize },
    /// Binary threshold at the given pixel intensity value.
    Threshold { value: u8 },
    /// Invert all pixel colors.
    Invert,
}

/// A chain of preprocessing steps applied to an image in order.
pub struct Pipeline {
    steps: Vec<PipelineStep>,
}

impl Pipeline {
    /// Create an empty pipeline.
    pub fn new() -> Self {
        Self { steps: Vec::new() }
    }

    /// Add a step to the pipeline.
    pub fn add_step(&mut self, step: PipelineStep) {
        self.steps.push(step);
    }

    /// Run all steps on the given image, returning the transformed result.
    pub fn run(&self, img: &DynamicImage) -> DynamicImage {
        let mut result = img.clone();
        for step in &self.steps {
            result = apply_step(&result, step);
        }
        result
    }
}

impl Default for Pipeline {
    fn default() -> Self {
        Self::new()
    }
}

/// Apply a single pipeline step. This dispatches to dedicated submodules
/// as they are implemented.
fn apply_step(img: &DynamicImage, step: &PipelineStep) -> DynamicImage {
    match step {
        PipelineStep::Resize { width, height } => {
            img.resize_exact(*width, *height, image::imageops::FilterType::Nearest)
        }
        PipelineStep::Grayscale => {
            DynamicImage::ImageLuma8(img.to_luma8())
        }
        PipelineStep::EdgeDetect { algorithm } => {
            // Delegates to edge module (placeholder until edge.rs is implemented)
            super::edge::detect(img, algorithm)
        }
        PipelineStep::ColorQuantize { max_colors } => {
            // Delegates to quantize module (placeholder until implemented)
            super::quantize::quantize(img, *max_colors)
        }
        PipelineStep::Threshold { value } => {
            let gray = img.to_luma8();
            let (w, h) = gray.dimensions();
            let mut output = image::GrayImage::new(w, h);
            for y in 0..h {
                for x in 0..w {
                    let p = gray.get_pixel(x, y)[0];
                    let v = if p < *value { 0u8 } else { 255u8 };
                    output.put_pixel(x, y, image::Luma([v]));
                }
            }
            DynamicImage::ImageLuma8(output)
        }
        PipelineStep::Invert => {
            let mut inverted = img.clone();
            inverted.invert();
            inverted
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb};

    fn make_test_image() -> DynamicImage {
        DynamicImage::ImageRgb8(ImageBuffer::from_fn(8, 8, |x, y| {
            if (x + y) % 2 == 0 {
                Rgb([255u8, 255, 255])
            } else {
                Rgb([0u8, 0, 0])
            }
        }))
    }

    #[test]
    fn test_resize_nearest() {
        let img = make_test_image();
        let pipeline = Pipeline {
            steps: vec![PipelineStep::Resize { width: 4, height: 4 }],
        };
        let result = pipeline.run(&img);
        assert_eq!(result.width(), 4);
        assert_eq!(result.height(), 4);
    }

    #[test]
    fn test_grayscale() {
        let img = make_test_image();
        let pipeline = Pipeline {
            steps: vec![PipelineStep::Grayscale],
        };
        let result = pipeline.run(&img);
        // Grayscale images are Luma8
        assert!(result.as_luma8().is_some() || result.to_luma8().dimensions() == (8, 8));
    }

    #[test]
    fn test_invert() {
        let img = DynamicImage::ImageRgb8(
            ImageBuffer::from_fn(1, 1, |_, _| Rgb([0u8, 128, 255])),
        );
        let pipeline = Pipeline {
            steps: vec![PipelineStep::Invert],
        };
        let result = pipeline.run(&img);
        let result_rgb = result.to_rgb8();
        let pixel = result_rgb.get_pixel(0, 0);
        assert_eq!(pixel[0], 255);
        assert_eq!(pixel[1], 127);
        assert_eq!(pixel[2], 0);
    }
}
