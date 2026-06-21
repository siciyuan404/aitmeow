//! Feature extraction from pixel art images.
//!
//! Analyzes a preprocessed image and produces a [`FeatureReport`] that
//! can be injected into AI prompts for template-driven SVG generation.

use image::{DynamicImage, GenericImageView};

/// Structured feature analysis of a pixel art image.
#[derive(Debug, Clone)]
pub struct FeatureReport {
    /// Grid dimensions (width × height in pixels).
    pub grid_size: (u32, u32),
    /// Total number of edge pixels detected.
    pub edge_pixels: usize,
    /// Edge pixel density as a fraction (0.0–1.0).
    pub edge_density: f64,
    /// Color distribution: (hex_color, percentage_of_image).
    pub color_distribution: Vec<(String, f64)>,
    /// Connected shape regions found in the image.
    pub shape_clusters: Vec<ShapeCluster>,
    /// Dominant visual direction, if detectable.
    pub primary_direction: Option<String>,
}

/// A connected region of similar pixels.
#[derive(Debug, Clone)]
pub struct ShapeCluster {
    /// Bounding box: (x, y, width, height).
    pub bbox: (u32, u32, u32, u32),
    /// Area in pixels.
    pub area_px: usize,
    /// Heuristic shape classification.
    pub shape_guess: String,
    /// Most common color within this cluster.
    pub dominant_color: String,
}

impl FeatureReport {
    /// Extract features from a (preprocessed) pixel art image.
    pub fn from_image(img: &DynamicImage) -> Self {
        let (width, height) = img.dimensions();
        let rgb = img.to_rgb8();

        // Count color distribution
        let total_pixels = (width * height) as usize;
        let mut color_counts: std::collections::HashMap<[u8; 3], usize> =
            std::collections::HashMap::new();
        for pixel in rgb.pixels() {
            let key = [pixel[0], pixel[1], pixel[2]];
            *color_counts.entry(key).or_insert(0) += 1;
        }

        // Sort colors by frequency
        let mut distribution: Vec<(String, f64)> = color_counts
            .iter()
            .map(|(c, count)| {
                let hex = format!("#{:02X}{:02X}{:02X}", c[0], c[1], c[2]);
                let pct = *count as f64 / total_pixels as f64;
                (hex, pct)
            })
            .collect();
        distribution.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Edge detection (simple: pixel differs significantly from neighbor)
        let mut edge_pixels = 0usize;
        for y in 0..height {
            for x in 0..width - 1 {
                let a = rgb.get_pixel(x, y);
                let b = rgb.get_pixel(x + 1, y);
                let dr = a[0] as i32 - b[0] as i32;
                let dg = a[1] as i32 - b[1] as i32;
                let db = a[2] as i32 - b[2] as i32;
                if dr.abs() > 30 || dg.abs() > 30 || db.abs() > 30 {
                    edge_pixels += 1;
                }
            }
        }
        for y in 0..height - 1 {
            for x in 0..width {
                let a = rgb.get_pixel(x, y);
                let b = rgb.get_pixel(x, y + 1);
                let dr = a[0] as i32 - b[0] as i32;
                let dg = a[1] as i32 - b[1] as i32;
                let db = a[2] as i32 - b[2] as i32;
                if dr.abs() > 30 || dg.abs() > 30 || db.abs() > 30 {
                    edge_pixels += 1;
                }
            }
        }

        let max_possible_edges = ((width - 1) * height + width * (height - 1)) as usize;
        let density = if max_possible_edges > 0 {
            edge_pixels as f64 / max_possible_edges as f64
        } else {
            0.0
        };

        // Simple shape clustering: find connected regions of non-background color
        let bg_color = rgb.get_pixel(0, 0);
        let mut clusters = find_clusters(&rgb, bg_color);

        // Assign shape guesses
        for cluster in &mut clusters {
            let aspect = cluster.bbox.2 as f64 / cluster.bbox.3.max(1) as f64;
            let fill = cluster.area_px as f64
                / (cluster.bbox.2 * cluster.bbox.3) as f64;

            cluster.shape_guess = if fill > 0.8 && (0.8..=1.25).contains(&aspect) {
                "rectangular".to_string()
            } else if fill > 0.7 && (0.7..=1.4).contains(&aspect) {
                "approximately square".to_string()
            } else if aspect > 3.0 || aspect < 0.33 {
                "linear/elongated".to_string()
            } else {
                "irregular".to_string()
            };
        }

        // Dominant direction heuristic
        let primary_direction = if width > height * 2 {
            Some("horizontal".to_string())
        } else if height > width * 2 {
            Some("vertical".to_string())
        } else {
            None
        };

        Self {
            grid_size: (width, height),
            edge_pixels,
            edge_density: density,
            color_distribution: distribution,
            shape_clusters: clusters,
            primary_direction,
        }
    }

    /// Convert feature report to AI-friendly prompt text.
    pub fn to_prompt_text(&self) -> String {
        let mut text = format!(
            "Reference image analysis ({}×{} grid):\n\
             - {} edge pixels detected (density: {:.0}%)\n",
            self.grid_size.0, self.grid_size.1,
            self.edge_pixels, self.edge_density * 100.0,
        );

        if !self.color_distribution.is_empty() {
            text.push_str(&format!(
                " - Color distribution: {}\n",
                self.color_distribution
                    .iter()
                    .take(8)
                    .map(|(c, p)| format!("{c} ({:.0}%)", p * 100.0))
                    .collect::<Vec<_>>()
                    .join(", "),
            ));
        }

        if let Some(dir) = &self.primary_direction {
            text.push_str(&format!(" - Primary direction: {dir}\n"));
        }

        if !self.shape_clusters.is_empty() {
            text.push_str(&format!(
                " - {} shape regions identified:\n",
                self.shape_clusters.len()
            ));
            for (i, cluster) in self.shape_clusters.iter().enumerate() {
                text.push_str(&format!(
                    "   region {}: {} {}px at ({},{}) {}\n",
                    i + 1,
                    cluster.dominant_color,
                    cluster.area_px,
                    cluster.bbox.0,
                    cluster.bbox.1,
                    cluster.shape_guess,
                ));
            }
        }

        text
    }
}

/// Simple connected-component labeling for foreground pixels.
/// Returns clusters of at least 4 pixels.
fn find_clusters(
    rgb: &image::RgbImage,
    bg_color: &image::Rgb<u8>,
) -> Vec<ShapeCluster> {
    let (width, height) = rgb.dimensions();
    // Determine if a pixel is "foreground" (different enough from background)
    let fg = |x: u32, y: u32| -> bool {
        let p = rgb.get_pixel(x, y);
        let dr = p[0] as i32 - bg_color[0] as i32;
        let dg = p[1] as i32 - bg_color[1] as i32;
        let db = p[2] as i32 - bg_color[2] as i32;
        dr.abs() > 20 || dg.abs() > 20 || db.abs() > 20
    };

    let mut visited: Vec<bool> = vec![false; (width * height) as usize];
    let mut clusters: Vec<ShapeCluster> = Vec::new();

    let directions = [(0i32, 1i32), (1, 0), (0, -1i32), (-1, 0)];

    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            if visited[idx] || !fg(x, y) {
                continue;
            }

            // BFS flood fill
            let mut queue = vec![(x, y)];
            visited[idx] = true;
            let mut pixels: Vec<(u32, u32)> = Vec::new();
            let mut min_x = x;
            let mut max_x = x;
            let mut min_y = y;
            let mut max_y = y;

            while let Some((cx, cy)) = queue.pop() {
                pixels.push((cx, cy));
                min_x = min_x.min(cx);
                max_x = max_x.max(cx);
                min_y = min_y.min(cy);
                max_y = max_y.max(cy);

                for (dx, dy) in &directions {
                    let nx = cx as i32 + dx;
                    let ny = cy as i32 + dy;
                    if nx >= 0 && ny >= 0 && nx < width as i32 && ny < height as i32 {
                        let nidx = (ny as u32 * width + nx as u32) as usize;
                        if !visited[nidx] && fg(nx as u32, ny as u32) {
                            visited[nidx] = true;
                            queue.push((nx as u32, ny as u32));
                        }
                    }
                }
            }

            if pixels.len() >= 4 {
                // Find dominant color
                let mut color_counts: std::collections::HashMap<[u8; 3], usize> =
                    std::collections::HashMap::new();
                for (px, py) in &pixels {
                    let c = rgb.get_pixel(*px, *py);
                    *color_counts.entry([c[0], c[1], c[2]]).or_insert(0) += 1;
                }
                let dominant = color_counts
                    .iter()
                    .max_by_key(|(_, count)| *count)
                    .map(|(c, _)| format!("#{:02X}{:02X}{:02X}", c[0], c[1], c[2]))
                    .unwrap_or_else(|| "#000000".to_string());

                clusters.push(ShapeCluster {
                    bbox: (min_x, min_y, max_x - min_x + 1, max_y - min_y + 1),
                    area_px: pixels.len(),
                    shape_guess: String::new(), // filled in by caller
                    dominant_color: dominant,
                });
            }
        }
    }

    clusters
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb};

    #[test]
    fn test_feature_report_basic() {
        // A simple 8×8 image: black background, white 3×3 square in center
        let mut img = ImageBuffer::from_fn(8, 8, |_x, _y| Rgb([0u8, 0, 0]));
        for y in 3..6 {
            for x in 3..6 {
                img.put_pixel(x, y, Rgb([255u8, 255, 255]));
            }
        }
        let img = DynamicImage::ImageRgb8(img);
        let report = FeatureReport::from_image(&img);

        assert_eq!(report.grid_size, (8, 8));
        assert!(report.color_distribution.len() >= 2); // black + white
        assert!(report.shape_clusters.len() >= 1);     // the white square

        let prompt = report.to_prompt_text();
        assert!(prompt.contains("8×8 grid"));
        assert!(prompt.contains("edge pixels"));
    }

    #[test]
    fn test_feature_report_empty_image() {
        let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(1, 1, |_, _| Rgb([128u8, 128, 128])));
        let report = FeatureReport::from_image(&img);
        assert_eq!(report.grid_size, (1, 1));
        assert_eq!(report.edge_pixels, 0);
        assert_eq!(report.edge_density, 0.0);
    }
}
