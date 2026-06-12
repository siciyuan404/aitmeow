use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::broadcast;

/// 参考 SVG —— 用户从仓库中选择作为生成参考的图
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReferenceSvg {
    pub id: String,
    pub name: String,
    pub svg_content: String,
}

/// 会话事件 —— 通过 broadcast channel 分发给 WebSocket 客户端
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SessionEvent {
    /// Claude Code 提交了生成的 SVG
    GenerationReady(GenerationResult),
    /// 桌面端更新了模板/参数选择
    #[serde(rename = "StateUpdated")]
    StateUpdated {
        template: Option<String>,
        params: HashMap<String, String>,
    },
}

/// Claude Code 生成的 SVG 结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GenerationResult {
    pub id: String,
    pub template_name: String,
    pub params: HashMap<String, String>,
    pub svg_content: String,
    pub created_at: String,
}

/// 服务端会话状态 —— 桌面端和 Claude Code 通过它共享上下文
pub struct SessionState {
    /// 桌面当前选中的模板名
    pub selected_template: Option<String>,
    /// 模板参数键值对
    pub template_params: HashMap<String, String>,
    /// 当前启用的验证规则
    pub active_rules: Vec<String>,
    /// 桌面端当前正在编辑的 SVG（推送开关打开时自动同步）
    pub pending_svg: Option<String>,
    /// Claude Code 最后一次提交的生成结果（桌面端消费后置为 None）
    pub pending_generation: Option<GenerationResult>,
    /// 用户从仓库中选择的参考 SVG（Agent 可参考该图生成）
    pub reference_svg: Option<ReferenceSvg>,
    /// 广播通道 —— WS 连接通过订阅此通道接收实时推送
    pub tx: broadcast::Sender<SessionEvent>,
}

impl SessionState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(16);
        Self {
            selected_template: None,
            template_params: HashMap::new(),
            active_rules: vec!["max_size".into(), "viewbox".into(), "require_ids".into()],
            reference_svg: None,
            pending_svg: None,
            pending_generation: None,
            tx,
        }
    }
}
