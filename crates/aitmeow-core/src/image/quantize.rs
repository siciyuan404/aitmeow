//! Color quantization for pixel art.
//!
//! Reduces an image to a fixed number of colors using median-cut quantization,
//! suitable for mapping photos to pixel palettes.

use image::DynamicImage;

/// Quantize an image to at most `max_colors` distinct colors.
///
/// Uses median-cut algorithm for high-quality results with small palettes.
/// Returns the quantized image. If `max_colors` is 0, returns the original unchanged.
pub fn quantize(img: &DynamicImage, max_colors: usize) -> DynamicImage {
    if max_colors == 0 {
        return img.clone();
    }

    let rgb = img.to_rgb8();
    let (width, height) = rgb.dimensions();

    // Collect all pixels
    let pixels: Vec<[u8; 3]> = rgb
        .pixels()
        .map(|p| [p[0], p[1], p[2]])
        .collect();

    // Median cut: recursively partition the color space
    let palette = median_cut(&pixels, max_colors);

    // Map each pixel to the nearest palette color
    let mut output = image::RgbImage::new(width, height);
    for (i, pixel) in pixels.iter().enumerate() {
        let nearest = nearest_color(pixel, &palette);
        let x = (i as u32) % width;
        let y = (i as u32) / width;
        output.put_pixel(x, y, image::Rgb(nearest));
    }

    DynamicImage::ImageRgb8(output)
}

/// Median cut algorithm: recursively split the color space along the
/// axis with the largest range until we have `k` buckets.
fn median_cut(pixels: &[[u8; 3]], k: usize) -> Vec<[u8; 3]> {
    if pixels.is_empty() || k == 0 {
        return vec![];
    }

    // Start with one bucket containing all pixels
    let mut buckets: Vec<Vec<[u8; 3]>> = vec![pixels.to_vec()];

    // Split until we have enough buckets
    while buckets.len() < k {
        // Find the bucket with the largest color range
        let mut max_range: f64 = 0.0;
        let mut max_idx = 0;

        for (i, bucket) in buckets.iter().enumerate() {
            let range = color_range(bucket);
            if range > max_range {
                max_range = range;
                max_idx = i;
            }
        }

        let bucket = buckets.remove(max_idx);
        if bucket.len() < 2 {
            // Can't split further, just put it back
            buckets.push(bucket);
            break;
        }

        // Find the channel with the widest range
        let (r_min, r_max) = channel_range(&bucket, 0);
        let (g_min, g_max) = channel_range(&bucket, 1);
        let (b_min, b_max) = channel_range(&bucket, 2);

        let r_range = r_max - r_min;
        let g_range = g_max - g_min;
        let b_range = b_max - b_min;

        let channel: usize = if r_range >= g_range && r_range >= b_range {
            0
        } else if g_range >= b_range {
            1
        } else {
            2
        };

        // Sort by the chosen channel and split at median
        let mut sorted = bucket;
        sorted.sort_by_key(|p| p[channel]);
        let median = sorted.len() / 2;

        let second = sorted.split_off(median);
        buckets.push(sorted);
        buckets.push(second);
    }

    // Compute average color for each bucket
    buckets
        .iter()
        .map(|bucket| {
            if bucket.is_empty() {
                return [0u8, 0, 0];
            }
            let (mut r, mut g, mut b) = (0u64, 0u64, 0u64);
            for p in bucket {
                r += p[0] as u64;
                g += p[1] as u64;
                b += p[2] as u64;
            }
            let n = bucket.len() as u64;
            [(r / n) as u8, (g / n) as u8, (b / n) as u8]
        })
        .collect()
}

/// Compute the range of color variation in a bucket as the max Euclidean distance.
fn color_range(bucket: &[[u8; 3]]) -> f64 {
    if bucket.is_empty() {
        return 0.0;
    }
    let (r_min, r_max) = channel_range(bucket, 0);
    let (g_min, g_max) = channel_range(bucket, 1);
    let (b_min, b_max) = channel_range(bucket, 2);
    let dr = (r_max - r_min) as f64;
    let dg = (g_max - g_min) as f64;
    let db = (b_max - b_min) as f64;
    (dr * dr + dg * dg + db * db).sqrt()
}

/// Find min/max for a single channel in a pixel bucket.
fn channel_range(bucket: &[[u8; 3]], channel: usize) -> (u8, u8) {
    let min = bucket.iter().map(|p| p[channel]).min().unwrap_or(0);
    let max = bucket.iter().map(|p| p[channel]).max().unwrap_or(0);
    (min, max)
}

/// Find the nearest palette color using Euclidean distance.
fn nearest_color(pixel: &[u8; 3], palette: &[[u8; 3]]) -> [u8; 3] {
    let mut best_dist = f64::MAX;
    let mut best_color = palette[0];

    for color in palette {
        let dr = pixel[0] as f64 - color[0] as f64;
        let dg = pixel[1] as f64 - color[1] as f64;
        let db = pixel[2] as f64 - color[2] as f64;
        let dist = dr * dr + dg * dg + db * db;
        if dist < best_dist {
            best_dist = dist;
            best_color = *color;
        }
    }

    best_color
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb};

    #[test]
    fn test_quantize_4_colors() {
        let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(32, 32, |x, y| {
            let r = (x * 8) as u8;
            let g = (y * 8) as u8;
            Rgb([r, g, 128u8])
        }));
        let result = quantize(&img, 4);
        assert_eq!(result.width(), 32);
        assert_eq!(result.height(), 32);
        // Count distinct colors
        let rgb = result.to_rgb8();
        let mut colors: std::collections::HashSet<[u8; 3]> = std::collections::HashSet::new();
        for p in rgb.pixels() {
            colors.insert([p[0], p[1], p[2]]);
        }
        assert!(colors.len() <= 4, "Expected ≤4 colors, got {}", colors.len());
    }

    #[test]
    fn test_quantize_zero_returns_unchanged() {
        let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(4, 4, |x, y| {
            Rgb([x as u8 * 64, y as u8 * 64, 0])
        }));
        let result = quantize(&img, 0);
        let rgb = result.to_rgb8();
        let orig = img.to_rgb8();
        for y in 0..4 {
            for x in 0..4 {
                assert_eq!(rgb.get_pixel(x, y), orig.get_pixel(x, y));
            }
        }
    }
}
