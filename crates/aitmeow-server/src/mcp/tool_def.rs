use serde_json::{json, Value};

pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
}

impl ToolDefinition {
    pub fn to_json(&self) -> Value {
        json!({
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
        })
    }
}

fn svg_preview() -> ToolDefinition {
    ToolDefinition {
        name: "svg_preview",
        description: "Submit SVG content to the desktop for real-time preview. Call this after generating SVG. The session context includes compiled_prompt (compiled generation instruction from selected template + template_params), selected_template, template_params, and reference_svg (if user selected a reference from the repo). Workflow: (1) optionally call session_state to get compiled_prompt context, (2) generate SVG based on compiled_prompt/reference_svg, (3) call svg_preview to push result to desktop.",
        input_schema: json!({
            "type": "object",
            "properties": {
                "svg_content": { "type": "string", "description": "Generated SVG content to preview on desktop" },
                "template_name": { "type": "string", "description": "Template name used for generation (default: quick-preview)" },
                "params": { "type": "object", "description": "Template parameters used", "additionalProperties": { "type": "string" } }
            },
            "required": ["svg_content"]
        }),
    }
}

pub fn list_tools() -> Value {
    json!({ "tools": [svg_preview().to_json()] })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_tools_returns_one_tool() {
        let result = list_tools();
        let tools = result["tools"].as_array().unwrap();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0]["name"], "svg_preview");
        assert!(tools[0]["inputSchema"]["properties"]["svg_content"].is_object());
    }
}
