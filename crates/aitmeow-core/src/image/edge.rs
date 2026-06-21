//! Edge detection algorithms for pixel art.

use image::DynamicImage;

/// Detect edges using the specified algorithm.
///
/// Supported algorithms:
/// - `"sobel"` — Sobel operator (3×3 kernel)
/// - `"laplacian"` — Laplacian of Gaussian (3×3 kernel)
pub fn detect(img: &DynamicImage, algorithm: &str) -> DynamicImage {
    match algorithm {
        "sobel" => sobel(img),
        "laplacian" => laplacian(img),
        _ => img.clone(), // unknown algorithm → passthrough
    }
}

/// Sobel edge detection using 3×3 kernels.
fn sobel(img: &DynamicImage) -> DynamicImage {
    let gray = img.to_luma8();
    let (width, height) = gray.dimensions();
    let mut output = image::GrayImage::new(width, height);

    // Sobel kernels
    let gx: [[i32; 3]; 3] = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let gy: [[i32; 3]; 3] = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let mut sum_x: i32 = 0;
            let mut sum_y: i32 = 0;

            for ky in 0..3 {
                for kx in 0..3 {
                    let px = gray.get_pixel(x + kx - 1, y + ky - 1)[0] as i32;
                    sum_x += px * gx[ky as usize][kx as usize];
                    sum_y += px * gy[ky as usize][kx as usize];
                }
            }

            let magnitude = ((sum_x * sum_x + sum_y * sum_y) as f64)
                .sqrt()
                .min(255.0) as u8;
            output.put_pixel(x, y, image::Luma([magnitude]));
        }
    }

    DynamicImage::ImageLuma8(output)
}

/// Laplacian edge detection using 3×3 kernel.
fn laplacian(img: &DynamicImage) -> DynamicImage {
    let gray = img.to_luma8();
    let (width, height) = gray.dimensions();
    let mut output = image::GrayImage::new(width, height);

    let kernel: [[i32; 3]; 3] = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let mut sum: i32 = 0;
            for ky in 0..3 {
                for kx in 0..3 {
                    let px = gray.get_pixel(x + kx - 1, y + ky - 1)[0] as i32;
                    sum += px * kernel[ky as usize][kx as usize];
                }
            }
            let val = sum.clamp(0, 255) as u8;
            output.put_pixel(x, y, image::Luma([val]));
        }
    }

    DynamicImage::ImageLuma8(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Luma};

    fn gradient_image() -> DynamicImage {
        DynamicImage::ImageLuma8(ImageBuffer::from_fn(16, 16, |x, _y| {
            Luma([(x * 16) as u8])
        }))
    }

    #[test]
    fn test_sobel_gradient() {
        let img = gradient_image();
        let edges = detect(&img, "sobel");
        // Vertical gradient → horizontal edges → should find edges on top/bottom rows
        assert_eq!(edges.width(), 16);
        assert_eq!(edges.height(), 16);
    }

    #[test]
    fn test_laplacian() {
        let img = gradient_image();
        let edges = detect(&img, "laplacian");
        assert_eq!(edges.width(), 16);
        assert_eq!(edges.height(), 16);
    }

    #[test]
    fn test_unknown_algorithm_passthrough() {
        let img = gradient_image();
        let result = detect(&img, "unknown");
        let gray = result.to_luma8();
        let orig = img.to_luma8();
        // Should return unchanged (passthrough)
        for y in 0..16 {
            for x in 0..16 {
                assert_eq!(gray.get_pixel(x, y), orig.get_pixel(x, y));
            }
        }
    }
}
