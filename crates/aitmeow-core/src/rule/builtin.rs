use crate::rule::Rule;

pub fn builtin_max_size(max_bytes: usize) -> Rule {
    Rule::MaxSize(max_bytes)
}

pub fn builtin_viewbox() -> Rule {
    Rule::CheckViewBox
}

pub fn builtin_require_ids() -> Rule {
    Rule::RequireIds
}

pub fn builtin_color_palette(colors: Vec<String>) -> Rule {
    Rule::ColorPalette(colors)
}

pub fn all_builtin_rules() -> Vec<Rule> {
    vec![
        Rule::MaxSize(102_400),
        Rule::CheckViewBox,
        Rule::RequireIds,
    ]
}
