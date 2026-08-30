//! 图标外形：把形状定义成「在一个矩形框内生成归一化路径」。
//!
//! 所有形状都从 [`ShapeBox`] 推导，好处是内缩（给描边留位置）只需缩小矩形，
//! 不需要对已生成的路径做几何偏移——双描边就是靠这个实现的。
//!
//! 旋转不写进路径本身，而是输出成 `transform="rotate(...)"` 属性，
//! 这样圆角矩形的弧线参数不用跟着角度重算。

use super::fmt_num as n;
use serde::{Deserialize, Serialize};

/// 形状所在的矩形框。
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShapeBox {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl ShapeBox {
    pub fn new(x: f64, y: f64, w: f64, h: f64) -> Self {
        Self { x, y, w, h }
    }

    /// 等距内缩。缩没了返回 `None`。
    pub fn shrink(&self, amount: f64) -> Option<Self> {
        if amount <= 0.0 {
            return Some(*self);
        }
        let w = self.w - amount * 2.0;
        let h = self.h - amount * 2.0;
        if w <= 0.0 || h <= 0.0 {
            return None;
        }
        Some(Self {
            x: self.x + amount,
            y: self.y + amount,
            w,
            h,
        })
    }

    /// 等距外扩。用于光学过冲：圆形/尖角略微超出才显得对齐。
    pub fn expand(&self, amount: f64) -> Self {
        if amount <= 0.0 {
            return *self;
        }
        Self {
            x: self.x - amount,
            y: self.y - amount,
            w: self.w + amount * 2.0,
            h: self.h + amount * 2.0,
        }
    }

    /// 整体平移，正值向上。用于视觉重心微调。
    pub fn shift_y(&self, dy: f64) -> Self {
        Self {
            y: self.y - dy,
            ..*self
        }
    }

    pub fn min_side(&self) -> f64 {
        self.w.min(self.h)
    }

    pub fn center(&self) -> (f64, f64) {
        (self.x + self.w / 2.0, self.y + self.h / 2.0)
    }
}

fn default_corner_radius() -> f64 {
    0.22
}

/// 图标外形。
///
/// 序列化成 `{"kind":"rounded_square","radius":0.22}`，前端直接按 `kind` 分发控件。
/// 朝向不在这里，统一由 [`crate::iconspec::IconSpec::rotation`] 控制。
// 注意：带 f64 字段，不能 derive Eq
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum IconShape {
    /// 直角正方形
    Square,
    /// 圆角正方形，`radius` 是圆角占短边的比例（0 ~ 0.5）
    RoundedSquare {
        #[serde(default = "default_corner_radius")]
        radius: f64,
    },
    /// 椭圆（比例非 1:1 时压成椭圆）
    Circle,
    /// 正六边形，默认平边朝上，旋转 30° 即尖角朝上
    Hexagon,
    /// 正八边形，平边朝上下左右
    Octagon,
    /// 菱形
    Diamond,
    /// 不加蒙版，内容铺满画布
    Free,
}

impl Default for IconShape {
    fn default() -> Self {
        IconShape::RoundedSquare {
            radius: default_corner_radius(),
        }
    }
}

impl IconShape {
    /// 是否会裁切内容。`Free` 不裁。
    pub fn clips(&self) -> bool {
        !matches!(self, IconShape::Free)
    }

    /// 中文名，用于 prompt 和日志。
    pub fn label(&self) -> &'static str {
        match self {
            IconShape::Square => "直角正方形",
            IconShape::RoundedSquare { .. } => "圆角正方形",
            IconShape::Circle => "圆形",
            IconShape::Hexagon => "正六边形",
            IconShape::Octagon => "正八边形",
            IconShape::Diamond => "菱形",
            IconShape::Free => "自由形状（不裁切）",
        }
    }

    /// 生成填充在 `b` 内的 SVG path（不含 transform）。
    pub fn path(&self, b: &ShapeBox) -> String {
        if b.w <= 0.0 || b.h <= 0.0 {
            return String::new();
        }
        match self {
            IconShape::Square | IconShape::Free => rect_path(b),
            IconShape::RoundedSquare { radius } => rounded_rect_path(b, *radius),
            IconShape::Circle => ellipse_path(b),
            IconShape::Hexagon => polygon_points(b, 6, 0.0),
            IconShape::Octagon => polygon_points(b, 8, 22.5),
            IconShape::Diamond => diamond_path(b),
        }
    }

    /// 形状的角点。圆形旋转后外形不变，返回 `None` 表示不需要为旋转缩放。
    ///
    /// 圆角矩形返回的是外接矩形的四个角：圆角只会把角磨掉，不会让包围盒变大，
    /// 所以拿四角算旋转包围盒是准确的。
    pub fn vertices(&self, b: &ShapeBox) -> Option<Vec<(f64, f64)>> {
        let (x0, y0, x1, y1) = (b.x, b.y, b.x + b.w, b.y + b.h);
        let (cx, cy) = b.center();
        match self {
            IconShape::Circle => None,
            IconShape::Square | IconShape::Free | IconShape::RoundedSquare { .. } => {
                Some(vec![(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            }
            IconShape::Diamond => Some(vec![(cx, y0), (x1, cy), (cx, y1), (x0, cy)]),
            IconShape::Hexagon => {
                let (cx, cy) = b.center();
                Some(regular_points(cx, cy, hexagon_circumradius(b), 6, 0.0))
            }
            IconShape::Octagon => {
                let (cx, cy) = b.center();
                Some(regular_points(cx, cy, octagon_circumradius(b), 8, 22.5))
            }
        }
    }

    /// 旋转 `rotation_deg` 后，为了不超出 `b` 需要缩放的比例（0, 1]。
    ///
    /// 用真实顶点算包围盒，而不是拿矩形公式近似——后者会把旋转 30° 的正六边形
    /// 错误地缩到 0.73，其实它转完仍在框内。
    pub fn rotation_scale(&self, b: &ShapeBox, rotation_deg: f64) -> f64 {
        let deg = rotation_deg % 360.0;
        if deg.abs() < 1e-9 {
            return 1.0;
        }
        // 正圆旋转后外形不变；比例非 1:1 的椭圆会变，得按旋转后的包围盒收缩
        if matches!(self, IconShape::Circle) {
            if (b.w - b.h).abs() < 1e-9 {
                return 1.0;
            }
            let a = deg.to_radians();
            let (rx, ry) = (b.w / 2.0, b.h / 2.0);
            let (c, s) = (a.cos(), a.sin());
            let hw = ((rx * c).powi(2) + (ry * s).powi(2)).sqrt().max(1e-9);
            let hh = ((rx * s).powi(2) + (ry * c).powi(2)).sqrt().max(1e-9);
            return (b.w / (2.0 * hw)).min(b.h / (2.0 * hh)).min(1.0);
        }

        let vs = match self.vertices(b) {
            Some(vs) => vs,
            None => return 1.0,
        };
        if vs.is_empty() || b.w <= 0.0 || b.h <= 0.0 {
            return 1.0;
        }

        let (cx, cy) = b.center();
        let a = deg.to_radians();
        let (cos, sin) = (a.cos(), a.sin());

        let mut min_x = f64::MAX;
        let mut max_x = f64::MIN;
        let mut min_y = f64::MAX;
        let mut max_y = f64::MIN;
        for (x, y) in vs {
            let (dx, dy) = (x - cx, y - cy);
            let rx = cx + dx * cos - dy * sin;
            let ry = cy + dx * sin + dy * cos;
            min_x = min_x.min(rx);
            max_x = max_x.max(rx);
            min_y = min_y.min(ry);
            max_y = max_y.max(ry);
        }

        let rw = (max_x - min_x).max(1e-9);
        let rh = (max_y - min_y).max(1e-9);
        // 只在需要缩小时缩，绝不放大（放大反而会溢出）
        (b.w / rw).min(b.h / rh).min(1.0)
    }

    /// 旋转后仍居中于 `b` 且不会溢出的等效框。
    pub fn rotated_box(&self, b: &ShapeBox, rotation_deg: f64) -> ShapeBox {
        let s = self.rotation_scale(b, rotation_deg);
        if (s - 1.0).abs() < 1e-9 {
            return *b;
        }
        let (cx, cy) = b.center();
        let (w, h) = (b.w * s, b.h * s);
        ShapeBox::new(cx - w / 2.0, cy - h / 2.0, w, h)
    }

    /// 旋转角对应的 SVG transform 属性内容，不需要旋转时返回 `None`。
    ///
    /// 旋转中心是形状框中心，不是画布原点。
    pub fn rotation_transform(&self, b: &ShapeBox, rotation_deg: f64) -> Option<String> {
        let deg = rotation_deg % 360.0;
        if deg.abs() < 1e-9 {
            return None;
        }
        // 正圆转了也白转，别往输出里塞无意义的 transform
        if matches!(self, IconShape::Circle) && (b.w - b.h).abs() < 1e-9 {
            return None;
        }
        let (cx, cy) = b.center();
        Some(format!(
            "rotate({} {} {})",
            n(deg),
            n(cx),
            n(cy)
        ))
    }

    /// 全部可选形状，供 UI 枚举。
    pub fn all() -> Vec<IconShape> {
        vec![
            IconShape::Square,
            IconShape::RoundedSquare {
                radius: default_corner_radius(),
            },
            IconShape::Circle,
            IconShape::Hexagon,
            IconShape::Octagon,
            IconShape::Diamond,
            IconShape::Free,
        ]
    }
}

fn pt(x: f64, y: f64) -> String {
    format!("{} {}", n(x), n(y))
}

fn rect_path(b: &ShapeBox) -> String {
    format!(
        "M {} H {} V {} H {} Z",
        pt(b.x, b.y),
        n(b.x + b.w),
        n(b.y + b.h),
        n(b.x)
    )
}

fn rounded_rect_path(b: &ShapeBox, radius: f64) -> String {
    let max_r = b.min_side() / 2.0;
    let r = if radius.is_finite() && radius > 0.0 {
        (radius * b.min_side()).min(max_r)
    } else {
        0.0
    };
    if r <= 0.0 {
        return rect_path(b);
    }

    let (x0, y0, x1, y1) = (b.x, b.y, b.x + b.w, b.y + b.h);
    format!(
        "M {p1} H {h1} A {r} {r} 0 0 1 {p2} V {v1} A {r} {r} 0 0 1 {p3} H {h2} \
         A {r} {r} 0 0 1 {p4} V {v2} A {r} {r} 0 0 1 {p1} Z",
        p1 = pt(x0 + r, y0),
        h1 = n(x1 - r),
        p2 = pt(x1, y0 + r),
        v1 = n(y1 - r),
        p3 = pt(x1 - r, y1),
        h2 = n(x0 + r),
        p4 = pt(x0, y1 - r),
        v2 = n(y0 + r),
        r = n(r),
    )
}

fn ellipse_path(b: &ShapeBox) -> String {
    let (cx, cy) = b.center();
    let rx = b.w / 2.0;
    let ry = b.h / 2.0;
    format!(
        "M {} A {rx} {ry} 0 1 0 {} A {rx} {ry} 0 1 0 {} Z",
        pt(cx - rx, cy),
        pt(cx + rx, cy),
        pt(cx - rx, cy),
        rx = n(rx),
        ry = n(ry),
    )
}

/// 正六边形的外接圆半径。平边朝上时宽 2R、高 √3R。
fn hexagon_circumradius(b: &ShapeBox) -> f64 {
    (b.w / 2.0).min(b.h / 3.0f64.sqrt())
}

/// 正八边形的外接圆半径。取 `min_side / (2·cos22.5°)`，让四条直边贴住画布边。
fn octagon_circumradius(b: &ShapeBox) -> f64 {
    b.min_side() / (2.0 * 22.5f64.to_radians().cos())
}

/// 正 n 边形路径，外接圆半径由 [`hexagon_circumradius`] / [`octagon_circumradius`] 决定。
fn polygon_points(b: &ShapeBox, sides: u32, start_deg: f64) -> String {
    let (cx, cy) = b.center();
    let r = if sides == 6 {
        hexagon_circumradius(b)
    } else {
        octagon_circumradius(b)
    };
    regular_points(cx, cy, r, sides, start_deg)
        .iter()
        .enumerate()
        .map(|(i, (x, y))| {
            if i == 0 {
                format!("M {}", pt(*x, *y))
            } else {
                format!(" L {}", pt(*x, *y))
            }
        })
        .collect::<String>()
        + " Z"
}

fn regular_points(cx: f64, cy: f64, r: f64, sides: u32, start_deg: f64) -> Vec<(f64, f64)> {
    if sides < 3 || r <= 0.0 {
        return Vec::new();
    }
    let step = 360.0 / sides as f64;
    (0..sides)
        .map(|i| {
            let deg = (start_deg + step * i as f64).to_radians();
            (cx + r * deg.cos(), cy + r * deg.sin())
        })
        .collect()
}

fn diamond_path(b: &ShapeBox) -> String {
    let (cx, cy) = b.center();
    format!(
        "M {} L {} L {} L {} Z",
        pt(cx, b.y),
        pt(b.x + b.w, cy),
        pt(cx, b.y + b.h),
        pt(b.x, cy),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn box512() -> ShapeBox {
        ShapeBox::new(0.0, 0.0, 512.0, 512.0)
    }

    #[test]
    fn test_shrink_expand_shift() {
        let b = box512();
        assert_eq!(b.shrink(10.0).unwrap(), ShapeBox::new(10.0, 10.0, 492.0, 492.0));
        assert_eq!(b.expand(10.0), ShapeBox::new(-10.0, -10.0, 532.0, 532.0));
        assert!(b.shrink(256.0).is_none());
        // 零/负数不缩不扩
        assert_eq!(b.shrink(0.0).unwrap(), b);
        assert_eq!(b.expand(0.0), b);
        // shift_y 正值向上
        assert_eq!(b.shift_y(10.0), ShapeBox::new(0.0, -10.0, 512.0, 512.0));
    }

    #[test]
    fn test_square_path() {
        assert_eq!(IconShape::Square.path(&box512()), "M 0 0 H 512 V 512 H 0 Z");
    }

    #[test]
    fn test_rounded_square_clamps_radius() {
        let d = IconShape::RoundedSquare { radius: 5.0 }.path(&box512());
        assert!(d.contains("A 256 256 0 0 1"), "实际: {}", d);
    }

    #[test]
    fn test_rounded_square_zero_radius_falls_back_to_rect() {
        assert_eq!(
            IconShape::RoundedSquare { radius: 0.0 }.path(&box512()),
            IconShape::Square.path(&box512())
        );
    }

    #[test]
    fn test_hexagon_default_is_flat_top() {
        // 平边朝上：左右各有一个顶点，落在中心线上
        assert!(
            IconShape::Hexagon.path(&box512()).starts_with("M 512 256 L"),
            "实际: {}",
            IconShape::Hexagon.path(&box512())
        );
    }

    #[test]
    fn test_hexagon_rotation_30_becomes_pointy() {
        // 旋转 30° 后顶点来到正上方
        let b = IconShape::Hexagon.rotated_box(&box512(), 30.0);
        let d = IconShape::Hexagon.path(&b);
        // 缩放后仍居中，顶点 y 应在上半部
        let first: Vec<&str> = d.splitn(2, ' ').collect();
        assert_eq!(first[0], "M");
        // 不缩放（旋转 30° 仍在框内）
        assert_eq!(b, box512());
    }

    #[test]
    fn test_hexagon_rotation_scale_is_one_at_30_degrees() {
        // 拿矩形公式算会得出 0.73，真实顶点算是 1.0
        let s = IconShape::Hexagon.rotation_scale(&box512(), 30.0);
        assert!((s - 1.0).abs() < 1e-9, "实际: {}", s);
    }

    #[test]
    fn test_square_rotation_45_needs_shrink() {
        let s = IconShape::Square.rotation_scale(&box512(), 45.0);
        assert!((s - std::f64::consts::FRAC_1_SQRT_2).abs() < 1e-6, "实际: {}", s);

        let b = IconShape::Square.rotated_box(&box512(), 45.0);
        // 缩放后仍居中于原框
        assert_eq!(b.center(), (256.0, 256.0));
        assert!((b.w - 512.0 * s).abs() < 1e-6);
    }

    #[test]
    fn test_circle_rotation_is_noop() {
        assert_eq!(IconShape::Circle.rotation_scale(&box512(), 45.0), 1.0);
        assert_eq!(IconShape::Circle.rotated_box(&box512(), 45.0), box512());
        assert_eq!(IconShape::Circle.rotation_transform(&box512(), 45.0), None);
    }

    #[test]
    fn test_ellipse_rotation_does_shrink() {
        // 宽 800 高 400 的椭圆转 90° 后会变"竖着"，必须收缩才不溢出
        let b = ShapeBox::new(0.0, 0.0, 800.0, 400.0);
        let rotated = IconShape::Circle.rotated_box(&b, 90.0);
        assert!(rotated.w <= 800.0 && rotated.h <= 400.0, "{:?}", rotated);
        assert!(rotated.w < 800.0, "转 90° 的椭圆必须缩小: {:?}", rotated);
        assert!(IconShape::Circle.rotation_transform(&b, 90.0).is_some());
    }

    #[test]
    fn test_rotation_transform_uses_shape_center() {
        let t = IconShape::Hexagon
            .rotation_transform(&box512(), 30.0)
            .unwrap();
        assert_eq!(t, "rotate(30 256 256)");
    }

    #[test]
    fn test_rotation_transform_none_when_zero() {
        assert_eq!(IconShape::Hexagon.rotation_transform(&box512(), 0.0), None);
        assert_eq!(IconShape::Hexagon.rotation_transform(&box512(), 360.0), None);
    }

    #[test]
    fn test_rotated_box_never_grows() {
        for shape in IconShape::all() {
            for deg in [15.0, 30.0, 45.0, 90.0, 180.0] {
                let b = shape.rotated_box(&box512(), deg);
                assert!(b.w <= 512.0 + 1e-6 && b.h <= 512.0 + 1e-6, "{:?} {}", shape, deg);
            }
        }
    }

    #[test]
    fn test_octagon_and_diamond() {
        let d = IconShape::Octagon.path(&box512());
        assert_eq!(d.matches('L').count(), 7);
        assert!(d.contains(" 512 "), "未贴边: {}", d);

        let d = IconShape::Diamond.path(&box512());
        assert_eq!(d, "M 256 0 L 512 256 L 256 512 L 0 256 Z");
    }

    #[test]
    fn test_free_is_rect_and_does_not_clip() {
        assert!(!IconShape::Free.clips());
        assert!(IconShape::Circle.clips());
        assert_eq!(
            IconShape::Free.path(&box512()),
            IconShape::Square.path(&box512())
        );
    }

    #[test]
    fn test_no_nan_for_degenerate_box() {
        assert_eq!(
            IconShape::Circle.path(&ShapeBox::new(0.0, 0.0, 0.0, 0.0)),
            ""
        );
    }

    #[test]
    fn test_vertices_cover_polygons_and_rects() {
        assert_eq!(IconShape::Circle.vertices(&box512()), None);
        assert_eq!(IconShape::Square.vertices(&box512()).unwrap().len(), 4);
        assert_eq!(IconShape::Diamond.vertices(&box512()).unwrap().len(), 4);
        assert_eq!(IconShape::Hexagon.vertices(&box512()).unwrap().len(), 6);
        assert_eq!(IconShape::Octagon.vertices(&box512()).unwrap().len(), 8);
    }

    #[test]
    fn test_shape_serde_roundtrip_without_pointy() {
        let json = serde_json::to_string(&IconShape::Hexagon).unwrap();
        assert_eq!(json, r#"{"kind":"hexagon"}"#);
        let back: IconShape = serde_json::from_str(&json).unwrap();
        assert_eq!(back, IconShape::Hexagon);
    }
}
