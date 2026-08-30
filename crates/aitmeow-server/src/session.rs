use aitmeow_core::iconspec::ReferenceItem;
use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::broadcast;

/// Claude Code 提交的生成结果
#[derive(Debug, Clone, Serialize)]
pub struct GenerationResult {
    /// 唯一标识符
    pub id: String,
    /// 使用的模板名
    pub template_name: String,
    /// 使用的参数
    pub params: HashMap<String, String>,
    /// SVG 内容
    pub svg_content: String,
    /// 创建时间
    pub created_at: String,
}

/// 用户选择的参考 SVG（Agent 可看到此结构来生成新 SVG）
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct ReferenceSvg {
    /// SVG 仓库中的 ID
    pub id: String,
    /// SVG 内容的摘要（或部分内容）
    pub summary: String,
}

/// WebSocket 推送的事件类型
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SessionEvent {
    /// 用户更新了模板选择或参数
    StateUpdated {
        template: Option<String>,
        params: HashMap<String, String>,
    },
    /// Claude Code 提交了新的 SVG 生成结果
    GenerationReady(GenerationResult),
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
    /// 用户拖进设定面板的多个参考元素，图标生成时全部编进 prompt。
    ///
    /// 和 `reference_svg` 是两套：那个是模板体系的单张参考图，
    /// 这个是 Icon Studio 的多参考元素，别互相覆盖。
    pub reference_items: Vec<ReferenceItem>,
    /// 用户上传的参考图片（PNG 原始字节），用于像素模板的 ImageReference 参数
    pub reference_image: Option<Vec<u8>>,
    /// 广播通道 —— WS 连接通过订阅此通道接收实时推送
    pub tx: broadcast::Sender<SessionEvent>,
}

impl SessionState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(16);
        Self {
            selected_template: None,
            template_params: HashMap::new(),
            active_rules: Vec::new(),
            pending_svg: None,
            pending_generation: None,
            reference_svg: None,
            reference_items: Vec::new(),
            reference_image: None,
            tx,
        }
    }
}
