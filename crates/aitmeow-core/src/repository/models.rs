use crate::iconspec::IconSpec;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 条目种类。`Asset` 是用户导入的参考素材，`Result` 是生成出来的成品。
///
/// 两者共用一张表：素材也是 SVG（位图素材把原始字节塞进 `thumbnail`），
/// 界面上用 Tab 分开只是视图层的筛选。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecordType {
    Result,
    Asset,
}

impl Default for RecordType {
    fn default() -> Self {
        RecordType::Result
    }
}

impl RecordType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RecordType::Result => "result",
            RecordType::Asset => "asset",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "asset" => RecordType::Asset,
            _ => RecordType::Result,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgRecord {
    pub id: String,
    pub name: String,
    pub svg_content: String,
    pub template_name: Option<String>,
    pub tags: Vec<String>,
    pub params: HashMap<String, String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub thumbnail: Option<Vec<u8>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// 所属集合。删除集合时置 NULL，条目不会被连带删掉。
    #[serde(default)]
    pub collection_id: Option<String>,
    /// 帧序号，从 0 开始；不是动画帧则为 None。
    #[serde(default)]
    pub frame_index: Option<u32>,
    #[serde(default)]
    pub record_type: RecordType,
    /// 生成这份素材时的图标设定快照，用于「用同样设定再来一次」。
    #[serde(default)]
    pub preset: Option<IconSpec>,
}

impl SvgRecord {
    pub fn new(name: String, svg_content: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            svg_content,
            template_name: None,
            tags: Vec::new(),
            params: HashMap::new(),
            width: None,
            height: None,
            thumbnail: None,
            created_at: now,
            updated_at: now,
            collection_id: None,
            frame_index: None,
            record_type: RecordType::default(),
            preset: None,
        }
    }

    pub fn with_template(mut self, name: impl Into<String>) -> Self {
        self.template_name = Some(name.into());
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn with_params(mut self, params: HashMap<String, String>) -> Self {
        self.params = params;
        self
    }

    pub fn with_collection(mut self, id: impl Into<String>) -> Self {
        self.collection_id = Some(id.into());
        self
    }

    pub fn with_frame(mut self, index: u32) -> Self {
        self.frame_index = Some(index);
        self
    }

    pub fn with_record_type(mut self, kind: RecordType) -> Self {
        self.record_type = kind;
        self
    }

    pub fn with_preset(mut self, preset: IconSpec) -> Self {
        self.preset = Some(preset);
        self
    }
}

/// 集合的来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CollectionKind {
    /// 一次批量生成的结果
    Batch,
    /// 一组动画帧
    Frameset,
    /// 用户手动分组
    Manual,
}

impl Default for CollectionKind {
    fn default() -> Self {
        CollectionKind::Manual
    }
}

impl CollectionKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            CollectionKind::Batch => "batch",
            CollectionKind::Frameset => "frameset",
            CollectionKind::Manual => "manual",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "batch" => CollectionKind::Batch,
            "frameset" => CollectionKind::Frameset,
            _ => CollectionKind::Manual,
        }
    }
}

/// 仓库里的一个集合。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub kind: CollectionKind,
    #[serde(default)]
    pub tags: Vec<String>,
    /// 建集合时的图标设定快照，整批重跑时直接用。
    #[serde(default)]
    pub preset: Option<IconSpec>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Collection {
    pub fn new(name: impl Into<String>, kind: CollectionKind) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.into(),
            kind,
            tags: Vec::new(),
            preset: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn with_preset(mut self, preset: IconSpec) -> Self {
        self.preset = Some(preset);
        self
    }

    /// 把 `updated_at` 刷成现在。改名/改标签后调用方不用自己依赖 chrono。
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}

/// 带条目数的集合，列表接口直接返回这个。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionSummary {
    pub id: String,
    pub name: String,
    pub kind: CollectionKind,
    pub tags: Vec<String>,
    pub preset: Option<IconSpec>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub item_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListOptions {
    pub offset: u32,
    pub limit: u32,
    pub sort_by: String,
    pub sort_order: String,
    pub tag: Option<String>,
    pub category: Option<String>,
    /// 只列某个集合里的条目
    #[serde(default)]
    pub collection_id: Option<String>,
    /// 只列成品或只列素材
    #[serde(default)]
    pub record_type: Option<RecordType>,
    /// 只要不属于任何集合的（仓库根目录）
    #[serde(default)]
    pub uncollected: bool,
}

impl Default for ListOptions {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 20,
            sort_by: "created_at".to_string(),
            sort_order: "desc".to_string(),
            tag: None,
            category: None,
            collection_id: None,
            record_type: None,
            uncollected: false,
        }
    }
}

/// 整库导出/导入用的打包格式。
///
/// 版本号是给未来的自己留的后路：schema 变了还能判断能不能读，
/// 而不是让旧备份直接把新库搞坏。
pub const EXPORT_FORMAT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseExport {
    pub version: u32,
    pub exported_at: DateTime<Utc>,
    pub collections: Vec<Collection>,
    pub records: Vec<SvgRecord>,
}

/// 导入模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImportMode {
    /// 清空现有数据后导入，结果是导出时的快照
    Replace,
    /// 按 id 合并：已存在的覆盖，没有的插入
    Merge,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct ImportReport {
    pub collections_added: usize,
    pub collections_updated: usize,
    pub records_added: usize,
    pub records_updated: usize,
    pub records_deleted: usize,
}
