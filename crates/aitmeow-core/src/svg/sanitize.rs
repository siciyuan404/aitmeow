use crate::error::Result;

pub fn sanitize(input: &str) -> Result<String> {
    let mut output = input.to_string();

    // Use case-insensitive replacement via regex for dangerous tags
    for tag in &["script", "foreignObject", "use", "foreignobject"] {
        let re = regex::Regex::new(&format!(r"(?i)<(/?){}[\s>]", regex::escape(tag))).unwrap();
        output = re.replace_all(&output, |caps: &regex::Captures| {
            format!("<!-- removed {} ", &caps[0])
        }).to_string();
        let close_re = regex::Regex::new(&format!(r"(?i)</{}[\s>]", regex::escape(tag))).unwrap();
        output = close_re.replace_all(&output, "-->").to_string();
    }

    // Remove event handler attributes (case-insensitive)
    let event_re = regex::Regex::new(r"(?i)\bon\w+\s*=").unwrap();
    output = event_re.replace_all(&output, "data-removed-=").to_string();

    // Remove javascript: URLs (case-insensitive)
    let js_re = regex::Regex::new(r"(?i)javascript:").unwrap();
    output = js_re.replace_all(&output, "blocked:").to_string();

    // Remove data:text/html URLs (case-insensitive)
    let data_re = regex::Regex::new(r"(?i)data:text/html").unwrap();
    output = data_re.replace_all(&output, "blocked:").to_string();

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_script() {
        let svg = r#"<svg><script>alert('xss')</script><circle/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("<script>"));
    }

    #[test]
    fn test_remove_onclick() {
        let svg = r#"<svg><circle onclick="alert(1)"/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("onclick="));
    }

    #[test]
    fn test_remove_javascript_url() {
        let svg = r#"<svg><a href="javascript:alert(1)">click</a></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("javascript:"));
    }
}
