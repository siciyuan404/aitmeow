use serde_json::Value;

#[derive(Debug, Clone)]
pub enum McpError {
    InvalidParams(String),
    MethodNotFound(String),
    InternalError(String),
    ToolError(String),
}

impl McpError {
    pub fn code(&self) -> i32 {
        match self {
            McpError::InvalidParams(_) => -32602,
            McpError::MethodNotFound(_) => -32601,
            McpError::InternalError(_) => -32603,
            McpError::ToolError(_) => -32000,
        }
    }

    pub fn message(&self) -> &str {
        match self {
            McpError::InvalidParams(m) => m,
            McpError::MethodNotFound(m) => m,
            McpError::InternalError(m) => m,
            McpError::ToolError(m) => m,
        }
    }

    pub fn to_json_rpc_error(&self) -> Value {
        serde_json::json!({
            "code": self.code(),
            "message": self.message(),
        })
    }
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

pub type McpResult<T> = std::result::Result<T, McpError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(McpError::InvalidParams("x".into()).code(), -32602);
        assert_eq!(McpError::MethodNotFound("x".into()).code(), -32601);
        assert_eq!(McpError::InternalError("x".into()).code(), -32603);
        assert_eq!(McpError::ToolError("x".into()).code(), -32000);
    }

    #[test]
    fn test_json_rpc_format() {
        let e = McpError::InvalidParams("bad input".into());
        let json = e.to_json_rpc_error();
        assert_eq!(json["code"], -32602);
        assert_eq!(json["message"], "bad input");
    }

    #[test]
    fn test_display() {
        let e = McpError::ToolError("broken".into());
        assert_eq!(format!("{}", e), "broken");
    }
}
