// Uses std::result::Result directly

#[derive(Debug, Clone)]
pub enum Rule {
    MaxSize(usize),
    CheckViewBox,
    RequireIds,
    ColorPalette(Vec<String>),
    Custom { name: String, pattern: String },
}

impl Rule {
    pub fn code(&self) -> &str {
        match self {
            Rule::MaxSize(_) => "R001",
            Rule::CheckViewBox => "R002",
            Rule::RequireIds => "R003",
            Rule::ColorPalette(_) => "R004",
            Rule::Custom { .. } => "R005",
        }
    }

    pub fn check(&self, svg: &str, _tree: &usvg::Tree) -> std::result::Result<(), String> {
        match self {
            Rule::MaxSize(max) => {
                if svg.len() > *max {
                    return Err(format!(
                        "SVG size {} bytes exceeds limit of {} bytes",
                        svg.len(),
                        max
                    ));
                }
            }
            Rule::CheckViewBox => {
                if !svg.contains("viewBox") {
                    return Err("SVG must contain a viewBox attribute".to_string());
                }
            }
            Rule::RequireIds => {
                let has_id = svg.contains(" id=") || svg.contains(" data-aitmeow-id=");
                if !has_id {
                    return Err(
                        "SVG elements must have id attributes for click selection".to_string(),
                    );
                }
            }
            Rule::ColorPalette(colors) => {
                let allowed: Vec<String> = colors.iter().map(|c| c.to_lowercase()).collect();
                let re = regex::Regex::new(r"#[0-9a-fA-F]{3,8}")
                    .map_err(|e| format!("Invalid color regex: {}", e))?;
                for cap in re.find_iter(svg) {
                    let hex = cap.as_str().to_lowercase();
                    if !allowed.contains(&hex) {
                        return Err(format!(
                            "Color {} is not in the allowed palette: {:?}",
                            hex.trim_start_matches('#'),
                            colors
                        ));
                    }
                }
            }
            Rule::Custom { name, pattern } => {
                let re = regex::Regex::new(pattern).map_err(|e| format!("Invalid regex: {}", e))?;
                if !re.is_match(svg) {
                    return Err(format!("Custom rule '{}': pattern '{}' not matched", name, pattern));
                }
            }
        }
        Ok(())
    }
}

pub struct RuleEngine {
    pub rules: Vec<Rule>,
}

impl RuleEngine {
    pub fn new(rules: Vec<Rule>) -> Self {
        Self { rules }
    }

    pub fn default_rules() -> Self {
        Self {
            rules: vec![Rule::MaxSize(102_400), Rule::CheckViewBox],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_size() {
        let svg = "<svg>...</svg>";
        assert!(Rule::MaxSize(100).check(svg, &dummy_tree()).is_ok());
        assert!(Rule::MaxSize(5).check(svg, &dummy_tree()).is_err());
    }

    #[test]
    fn test_viewbox() {
        assert!(Rule::CheckViewBox
            .check(r#"<svg viewBox="0 0 100 100">"#, &dummy_tree())
            .is_ok());
        assert!(Rule::CheckViewBox
            .check(r#"<svg>"#, &dummy_tree())
            .is_err());
    }

    fn dummy_tree() -> usvg::Tree {
        usvg::Tree::from_str(
            r#"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"></svg>"#,
            &usvg::Options::default(),
        )
        .unwrap()
    }
}
