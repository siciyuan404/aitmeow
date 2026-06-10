use crate::error::Result;
use crate::rule::Rule;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub code: String,
}

pub fn validate_svg(input: &str, rules: &[Rule]) -> Result<ValidationResult> {
    let cleaned = super::sanitize::sanitize(input)?;

    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    match usvg::Tree::from_str(&cleaned, &usvg::Options::default()) {
        Err(e) => {
            errors.push(ValidationError {
                line: 0,
                column: 0,
                message: format!("SVG syntax error: {}", e),
                code: "E001".to_string(),
            });
        }
        Ok(tree) => {
            let svg_elem = tree.root();
            if !svg_elem.has_children() {
                warnings.push("SVG has no content".to_string());
            }

            let size = tree.size();
            if size.width() < 1.0 || size.height() < 1.0 {
                warnings.push("SVG has zero or negative dimensions".to_string());
            }

            for rule in rules {
                if let Err(e) = rule.check(&cleaned, &tree) {
                    errors.push(ValidationError {
                        line: 0,
                        column: 0,
                        message: e,
                        code: rule.code().to_string(),
                    });
                }
            }
        }
    }

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_svg() {
        let svg = r#"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>"#;
        let result = validate_svg(svg, &[]).unwrap();
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_invalid_svg() {
        let svg = "<not-svg>";
        let result = validate_svg(svg, &[]).unwrap();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
    }
}
