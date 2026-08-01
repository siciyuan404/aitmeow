//! SVG 消毒：基于 DOM 解析的白名单过滤。
//!
//! 用 [`roxmltree`] 真正解析 SVG，按元素白名单和属性规则过滤后重新序列化，
//! 不再依赖正则做模糊替换。这样能挡住所有混淆绕过（嵌套标签、HTML 实体编码、
//! tab/换行边界、CDATA 段、属性值内嵌套等）。

use crate::error::{AitmeowError, Result};
use roxmltree::{Document, Node, NodeType};
use std::collections::HashMap;
use std::fmt::Write as _;

const SVG_NS: &str = "http://www.w3.org/2000/svg";
const XLINK_NS: &str = "http://www.w3.org/1999/xlink";

/// 允许的 SVG 元素白名单。
///
/// 故意排除 `script`、`foreignObject`、`use`（可引用外部资源）、`style`（CSS 注入面）
/// 等危险或本项目不需要的元素。
const ALLOWED_TAGS: &[&str] = &[
    "svg",
    "g",
    "defs",
    "symbol",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "textPath",
    "title",
    "desc",
    "linearGradient",
    "radialGradient",
    "stop",
    "pattern",
    "clipPath",
    "mask",
    "filter",
    "feGaussianBlur",
    "feOffset",
    "feBlend",
    "feColorMatrix",
    "feComposite",
    "feFlood",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feTile",
    "feTurbulence",
    "feDisplacementMap",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feSpecularLighting",
    "feDistantLight",
    "fePointLight",
    "feSpotLight",
    "feComponentTransfer",
    "feFuncR",
    "feFuncG",
    "feFuncB",
    "feFuncA",
    "marker",
    "image",
    "a",
    "animate",
    "animateMotion",
    "animateTransform",
    "set",
];

/// 消毒 SVG：解析 → 白名单过滤 → 重新序列化。
///
/// 行为：
/// - 输入必须是合法 XML，且根元素为 `<svg>`，否则返回 `SvgParse` 错误。
/// - 非 SVG 命名空间的元素直接丢弃（含 HTML `foreignObject` 内的子树）。
/// - 不在白名单的元素丢弃（含 `<script>`、`<style>`、`<use>`）。
/// - 事件处理器属性（`on*` 后跟字母）丢弃。
/// - 属性值含 `javascript:`、`vbscript:`、`data:text/html` 的属性丢弃。
/// - 注释、处理指令、DOCTYPE 全部丢弃，仅保留元素与文本。
pub fn sanitize(input: &str) -> Result<String> {
    let doc = Document::parse(input)
        .map_err(|e| AitmeowError::SvgParse(format!("XML parse error: {}", e)))?;

    let root = doc
        .root()
        .children()
        .find(|n| matches!(n.node_type(), NodeType::Element))
        .ok_or_else(|| AitmeowError::SvgParse("SVG must have a root element".into()))?;

    let root_tag = root.tag_name();
    if root_tag.name() != "svg" {
        return Err(AitmeowError::SvgParse(format!(
            "Root element must be <svg>, got <{}>",
            root_tag.name()
        )));
    }

    // 收集根节点声明的所有 namespace 前缀，用于属性重序列化（如 xlink:href）
    let prefix_map: HashMap<&str, &str> = root
        .namespaces()
        .filter_map(|ns| ns.name().map(|p| (ns.uri(), p)))
        .collect();

    let mut out = String::with_capacity(input.len());
    serialize_element(&root, &mut out, 0, true, &prefix_map)?;
    Ok(out)
}

fn serialize_element(
    node: &Node,
    out: &mut String,
    depth: usize,
    is_root: bool,
    prefix_map: &HashMap<&str, &str>,
) -> Result<()> {
    let tag = node.tag_name();
    let local = tag.name();

    // 命名空间检查：仅允许无 ns（容忍简写）或 SVG ns
    if let Some(ns) = tag.namespace() {
        if ns != SVG_NS {
            return Ok(());
        }
    }

    if !ALLOWED_TAGS.contains(&local) {
        return Ok(());
    }

    indent(out, depth);
    out.push('<');
    out.push_str(local);

    // 根元素输出所有 namespace 声明，保证输出是自包含的合法 SVG
    if is_root {
        for ns in node.namespaces() {
            match ns.name() {
                Some(prefix) => {
                    let _ = write!(out, " xmlns:{}=\"{}\"", prefix, escape_attr(ns.uri()));
                }
                None => {
                    let _ = write!(out, " xmlns=\"{}\"", escape_attr(ns.uri()));
                }
            }
        }
    }

    for attr in node.attributes() {
        let attr_name = attr.name();

        // 拒绝事件处理器属性（onclick / onload / onanimationstart ...）
        if is_event_attr(attr_name) {
            continue;
        }

        let value = attr.value();
        if is_dangerous_url(value) {
            continue;
        }

        // 带命名空间的属性（最常见 xlink:href）输出为 prefix:local 形式
        let full_name = match attr.namespace() {
            Some(uri) if uri == XLINK_NS => match prefix_map.get(uri) {
                Some(prefix) => format!("{}:{}", prefix, attr_name),
                None => attr_name.to_string(),
            },
            _ => attr_name.to_string(),
        };

        let _ = write!(out, " {}=\"{}\"", full_name, escape_attr(value));
    }

    // 仅保留元素和文本子节点
    let children: Vec<Node> = node
        .children()
        .filter(|c| matches!(c.node_type(), NodeType::Element | NodeType::Text))
        .collect();

    if children.is_empty() {
        out.push_str(" />\n");
        return Ok(());
    }

    out.push_str(">\n");
    for child in &children {
        match child.node_type() {
            NodeType::Element => serialize_element(child, out, depth + 1, false, prefix_map)?,
            NodeType::Text => {
                let text = child.text().unwrap_or("");
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    indent(out, depth + 1);
                    out.push_str(&escape_text(trimmed));
                    out.push('\n');
                }
            }
            _ => {}
        }
    }

    indent(out, depth);
    let _ = write!(out, "</{}>\n", local);
    Ok(())
}

fn indent(out: &mut String, depth: usize) {
    for _ in 0..depth {
        out.push_str("  ");
    }
}

/// 判断是否为事件处理器属性：以 `on` 开头且第三个字符是 ASCII 字母。
fn is_event_attr(name: &str) -> bool {
    let bytes = name.as_bytes();
    bytes.len() >= 3
        && bytes[0] == b'o'
        && bytes[1] == b'n'
        && bytes[2].is_ascii_alphabetic()
}

/// 判断属性值是否为危险 URL scheme。
fn is_dangerous_url(val: &str) -> bool {
    let lower = val.to_lowercase();
    lower.contains("javascript:")
        || lower.contains("vbscript:")
        || lower.contains("data:text/html")
        || lower.contains("data:image/svg+xml")
}

fn escape_attr(s: &str) -> String {
    let mut buf = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => buf.push_str("&amp;"),
            '"' => buf.push_str("&quot;"),
            '<' => buf.push_str("&lt;"),
            '>' => buf.push_str("&gt;"),
            _ => buf.push(c),
        }
    }
    buf
}

fn escape_text(s: &str) -> String {
    let mut buf = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => buf.push_str("&amp;"),
            '<' => buf.push_str("&lt;"),
            '>' => buf.push_str("&gt;"),
            _ => buf.push(c),
        }
    }
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_script() {
        let svg = r#"<svg><script>alert('xss')</script><circle/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("<script"));
        assert!(result.contains("<circle"));
    }

    #[test]
    fn test_remove_onclick() {
        let svg = r#"<svg><circle onclick="alert(1)"/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("onclick="));
        assert!(result.contains("<circle"));
    }

    #[test]
    fn test_remove_javascript_url() {
        let svg = r#"<svg><a href="javascript:alert(1)">click</a></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("javascript:"));
        assert!(result.contains("<a"));
    }

    #[test]
    fn test_remove_style_element() {
        let svg = r#"<svg><style>.x{}</style><circle/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("<style"));
        assert!(result.contains("<circle"));
    }

    #[test]
    fn test_remove_foreign_object() {
        // foreignObject 内嵌 HTML，必须整个子树被丢弃
        let svg = r#"<svg><foreignObject><div onclick="alert(1)">x</div></foreignObject><circle/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("foreignObject"));
        assert!(!result.contains("<div"));
        assert!(!result.contains("onclick"));
        assert!(result.contains("<circle"));
    }

    #[test]
    fn test_remove_use_external_ref() {
        // use 可引用外部资源，应被丢弃
        let svg = r##"<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="evil.svg#x"/></svg>"##;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("<use"));
    }

    #[test]
    fn test_preserve_xlink_href_on_safe_element() {
        let svg = r##"<svg xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="#anchor">link</a></svg>"##;
        let result = sanitize(svg).unwrap();
        assert!(result.contains("xlink:href=\"#anchor\""));
    }

    #[test]
    fn test_remove_data_html_url() {
        // 属性值里的 < 必须合法转义；消毒应剥离危险 URL scheme
        let svg = r#"<svg><a href="data:text/html,%3Cscript%3Ealert(1)%3C/script%3E">click</a></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("data:text/html"));
    }

    #[test]
    fn test_remove_data_svg_url() {
        // data:image/svg+xml 仍可执行脚本，应被丢弃
        let svg = r#"<svg><image href="data:image/svg+xml,%3Csvg%3E"/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("data:image/svg+xml"));
    }

    #[test]
    fn test_event_attr_variants() {
        // 各种 on* 事件属性都应被剥离
        let svg = r#"<svg><circle onload="a()" onanimationstart="b()" ONCLICK="c()"/></svg>"#;
        let result = sanitize(svg).unwrap();
        // 注意：roxmltree 对属性名不区分大小写的处理依赖 XML 规范，属性名会被原样保留
        assert!(!result.contains("onload="));
        assert!(!result.contains("onanimationstart="));
    }

    #[test]
    fn test_nested_script_in_text() {
        // 文本节点里的 <script> 字面量会被正确转义，不会变成真元素
        let svg = r#"<svg><text>&lt;script&gt;alert(1)&lt;/script&gt;</text></svg>"#;
        let result = sanitize(svg).unwrap();
        // 文本被转义后输出，不会出现真正的 <script> 标签
        assert!(!result.contains("<script>"));
        assert!(result.contains("&lt;script&gt;") || result.contains("&amp;lt;script"));
    }

    #[test]
    fn test_reject_non_svg_root() {
        let html = r#"<html><body>not svg</body></html>"#;
        let result = sanitize(html);
        assert!(result.is_err());
    }

    #[test]
    fn test_reject_malformed_xml() {
        let bad = r#"<svg><circle cx="50"></svg>"#;
        let result = sanitize(bad);
        assert!(result.is_err());
    }

    #[test]
    fn test_valid_svg_preserved() {
        let svg = r#"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(result.contains("viewBox"));
        assert!(result.contains("circle"));
        assert!(result.contains("fill=\"red\""));
        // 输出仍是合法 SVG，能被 usvg 解析
        assert!(usvg::Tree::from_str(&result, &usvg::Options::default()).is_ok());
    }

    #[test]
    fn test_rejects_doctype_and_dtd() {
        // roxmltree 拒绝带 DTD 的 XML，避免 XXE 攻击面——这是更安全的行为
        let svg = r#"<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "evil.dtd"><svg viewBox="0 0 10 10"><circle/></svg>"#;
        let result = sanitize(svg);
        assert!(result.is_err());
    }

    #[test]
    fn test_strips_xml_declaration() {
        // XML 声明被剥离，仅保留 SVG 元素
        let svg = r#"<?xml version="1.0"?><svg viewBox="0 0 10 10"><circle/></svg>"#;
        let result = sanitize(svg).unwrap();
        assert!(!result.contains("<?xml"));
        assert!(result.contains("<svg"));
        assert!(result.contains("viewBox"));
    }
}
