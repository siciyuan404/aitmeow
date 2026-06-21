//! Classic pixel art palette constants.
//!
//! Each palette is a slice of hex color strings.
//! These are used by [`crate::template::schema::TemplateOption::PixelPalette`]
//! to provide preset color schemes, and by the image quantization pipeline
//! to map input image colors to palette colors.

/// Gameboy (DMG) 4-color palette — the iconic pea-soup green monochrome.
pub const GAMEBOY: &[&str] = &["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];

/// PICO-8 16-color palette — the fantasy console standard.
pub const PICO8: &[&str] = &[
    "#000000", "#1D2B53", "#7E2553", "#008751",
    "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8",
    "#FF004D", "#FFA300", "#FFEC27", "#00E436",
    "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA",
];

/// CGA palette 1 (high intensity) — cyan, magenta, white, black.
pub const CGA_PALETTE_1: &[&str] = &["#000000", "#55FFFF", "#FF55FF", "#FFFFFF"];

/// CGA palette 0 (low intensity) — the darker variant.
pub const CGA_PALETTE_0: &[&str] = &["#000000", "#00AAAA", "#AA00AA", "#AAAAAA"];

/// 2-color monochrome (1-bit).
pub const MONO_2: &[&str] = &["#000000", "#FFFFFF"];

/// 4-level grayscale.
pub const MONO_4: &[&str] = &["#000000", "#555555", "#AAAAAA", "#FFFFFF"];

/// Commodore 64 16-color palette.
pub const C64: &[&str] = &[
    "#000000", "#FFFFFF", "#880000", "#AAFFEE",
    "#CC44CC", "#00CC55", "#0000AA", "#EEEE77",
    "#DD8855", "#664400", "#FF7777", "#333333",
    "#777777", "#AAFF66", "#0088FF", "#BBBBBB",
];

/// NES classic palette — 54 unique colors (not all are used, but representative subset).
pub const NES: &[&str] = &[
    "#7C7C7C", "#0000FC", "#0000BC", "#4428BC",
    "#940084", "#A80020", "#A81000", "#881400",
    "#503000", "#007800", "#006800", "#005800",
    "#004058", "#000000", "#000000", "#000000",
    "#BCBCBC", "#0078F8", "#0058F8", "#6844FC",
    "#D800CC", "#E40058", "#F83800", "#E45C10",
    "#AC7C00", "#00B800", "#00A800", "#00A844",
    "#008888", "#000000", "#000000", "#000000",
    "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8",
    "#F878F8", "#F85898", "#F87858", "#FCA044",
    "#F8B800", "#B8F818", "#58D854", "#58F898",
    "#00E8D8", "#787878", "#000000", "#000000",
    "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8",
    "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8",
];

/// All named palette presets accessible by key.
pub fn get_palette(name: &str) -> Option<&'static [&'static str]> {
    match name {
        "gameboy" => Some(GAMEBOY),
        "pico8" | "pico-8" => Some(PICO8),
        "cga" | "cga1" => Some(CGA_PALETTE_1),
        "cga0" => Some(CGA_PALETTE_0),
        "mono2" | "mono-2" | "1bit" => Some(MONO_2),
        "mono4" | "mono-4" | "grayscale" => Some(MONO_4),
        "c64" | "commodore64" => Some(C64),
        "nes" | "nintendo" => Some(NES),
        _ => None,
    }
}

/// List all available palette preset names.
pub fn list_presets() -> Vec<&'static str> {
    vec!["gameboy", "pico8", "cga", "cga0", "mono2", "mono4", "c64", "nes"]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_palette_gameboy() {
        let p = get_palette("gameboy").unwrap();
        assert_eq!(p.len(), 4);
        assert_eq!(p[0], "#0f380f");
    }

    #[test]
    fn test_get_palette_pico8() {
        let p = get_palette("pico8").unwrap();
        assert_eq!(p.len(), 16);
    }

    #[test]
    fn test_get_palette_unknown_is_none() {
        assert!(get_palette("nonexistent").is_none());
    }

    #[test]
    fn test_list_presets_has_all() {
        let presets = list_presets();
        assert!(presets.contains(&"gameboy"));
        assert!(presets.contains(&"pico8"));
        assert!(presets.contains(&"nes"));
    }
}
