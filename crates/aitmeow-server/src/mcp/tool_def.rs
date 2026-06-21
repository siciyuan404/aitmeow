use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

pub fn list_tools() -> Vec<ToolDefinition> {
    vec![tool_svg_preview(), tool_session_state()]
}

fn tool_svg_preview() -> ToolDefinition {
    ToolDefinition {
        name: "svg_preview".to_string(),
        description: "Submit an SVG to the AitMeow desktop preview. The SVG will be rendered in the desktop UI's preview panel.".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "svg_content": {
                    "type": "string",
                    "description": "The full SVG markup to preview"
                },
                "template_name": {
                    "type": "string",
                    "description": "Optional template name for context"
                },
                "params": {
                    "type": "object",
                    "description": "Optional template parameters used for generation"
                }
            },
            "required": ["svg_content"]
        }),
    }
}

fn tool_session_state() -> ToolDefinition {
    ToolDefinition {
        name: "session_state".to_string(),
        description: "Read the current desktop user's session context: selected template, parameter values, active rules, and the compiled AI prompt. Use this before generating an SVG to understand what the user is working on.".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {},
            "required": []
        }),
    }
}
