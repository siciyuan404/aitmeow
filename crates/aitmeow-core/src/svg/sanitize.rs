use crate::error::Result;

pub fn sanitize(input: &str) -> Result<String> {
    let mut output = input.to_string();

    let dangerous_tags = ["script", "foreignObject", "use"];
    for tag in dangerous_tags {
        let open_start = format!("<{}", tag);
        let open_end = format!("<{} ", tag);
        let close = format!("</{}>", tag);

        output = output.replace(&open_start, &format!("<!-- removed {} ", tag));
        output = output.replace(&open_end, &format!("<!-- removed {} ", tag));
        output = output.replace(&close, "-->");
    }

    let event_attrs = [
        "onclick", "onload", "onerror", "onmouseover", "onmouseout",
        "onmousedown", "onmouseup", "onfocus", "onblur", "onchange",
        "onsubmit", "onreset", "onselect", "onkeydown", "onkeyup",
        "onkeypress", "ondblclick", "onabort", "onunload",
    ];
    for attr in event_attrs {
        output = output.replace(&format!("{}=", attr), "data-removed-=");
    }

    output = output.replace("javascript:", "blocked:");
    output = output.replace("data:text/html", "blocked:");

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
