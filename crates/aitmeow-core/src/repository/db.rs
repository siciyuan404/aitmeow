use crate::error::Result;
use crate::repository::models::{
    Collection, CollectionKind, CollectionSummary, DatabaseExport, ImportMode, ImportReport,
    ListOptions, RecordType, SvgRecord, EXPORT_FORMAT_VERSION,
};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct Repository {
    pool: SqlitePool,
}

impl Repository {
    pub async fn open(path: &Path) -> Result<Self> {
        // ":memory:" 只有在走连接串解析时才是「内存库」，
        // 落到 filename() 上会被当成字面文件名（在 Windows 上还是个非法文件名）。
        if path.as_os_str() == ":memory:" {
            return Self::open_memory().await;
        }

        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() && parent != Path::new("") {
                tokio::fs::create_dir_all(parent).await?;
            }
        }

        // 必须显式 create_if_missing(true)：sqlx 的默认是 false，
        // 首次启动（还没有 .db 文件）会直接报 SQLITE_CANTOPEN 起不来。
        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        let repo = Self { pool };
        repo.migrate().await?;

        Ok(repo)
    }

    pub async fn open_memory() -> Result<Self> {
        // 内存库必须开 shared_cache，否则连接池里每条连接各是一个空库
        let options = SqliteConnectOptions::from_str("sqlite::memory:")?;

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;

        let repo = Self { pool };
        repo.migrate().await?;

        Ok(repo)
    }

    pub async fn migrate(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS svg_records (
                id          TEXT PRIMARY KEY NOT NULL,
                name        TEXT NOT NULL,
                svg_content TEXT NOT NULL,
                template_name TEXT,
                tags        TEXT NOT NULL DEFAULT '[]',
                params      TEXT NOT NULL DEFAULT '{}',
                width       INTEGER,
                height      INTEGER,
                thumbnail   BLOB,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_svg_records_created
            ON svg_records(created_at DESC)
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS collections (
                id          TEXT PRIMARY KEY NOT NULL,
                name        TEXT NOT NULL,
                kind        TEXT NOT NULL DEFAULT 'manual',
                tags        TEXT NOT NULL DEFAULT '[]',
                preset_json TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 增量加列：老库不能 DROP 重建，历史数据得留着
        self.ensure_column("svg_records", "collection_id", "TEXT")
            .await?;
        self.ensure_column("svg_records", "frame_index", "INTEGER")
            .await?;
        self.ensure_column("svg_records", "record_type", "TEXT NOT NULL DEFAULT 'result'")
            .await?;
        self.ensure_column("svg_records", "preset_json", "TEXT")
            .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_svg_records_collection
            ON svg_records(collection_id)
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_svg_records_type
            ON svg_records(record_type)
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 列出表已有的列名。
    async fn table_columns(&self, table: &str) -> Result<Vec<String>> {
        // PRAGMA 不接受绑定参数，表名只能拼进 SQL —— 所以先严格校验标识符。
        check_identifier(table)?;
        // table_info 返回 6 列：cid, name, type, notnull, dflt_value, pk。要的是第 2 列 name。
        // 用元组按位置取，struct 的 FromRow 是按列名映射的，套不上 PRAGMA 的列名。
        let rows = sqlx::query_as::<_, (i64, String, Option<String>, i64, Option<String>, i64)>(
            &format!("PRAGMA table_info({})", table),
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.1).collect())
    }

    /// 缺哪列加哪列。已存在则什么都不做。
    async fn ensure_column(&self, table: &str, column: &str, decl: &str) -> Result<()> {
        check_identifier(table)?;
        check_identifier(column)?;
        if self
            .table_columns(table)
            .await?
            .iter()
            .any(|c| c == column)
        {
            return Ok(());
        }
        sqlx::query(&format!(
            "ALTER TABLE {} ADD COLUMN {} {}",
            table, column, decl
        ))
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn save(&self, record: &SvgRecord) -> Result<()> {
        let tags_json = serde_json::to_string(&record.tags).unwrap_or_default();
        let params_json = serde_json::to_string(&record.params).unwrap_or_default();
        let preset_json = encode_preset(&record.preset);

        let existing = self.get(&record.id).await?;

        if existing.is_some() {
            sqlx::query(
                r#"
                UPDATE svg_records
                SET name = ?,
                    svg_content = ?,
                    template_name = ?,
                    tags = ?,
                    params = ?,
                    width = ?,
                    height = ?,
                    thumbnail = ?,
                    collection_id = ?,
                    frame_index = ?,
                    record_type = ?,
                    preset_json = ?,
                    updated_at = ?
                WHERE id = ?
                "#,
            )
            .bind(&record.name)
            .bind(&record.svg_content)
            .bind(&record.template_name)
            .bind(&tags_json)
            .bind(&params_json)
            .bind(record.width.map(|w| w as i64))
            .bind(record.height.map(|h| h as i64))
            .bind(&record.thumbnail)
            .bind(&record.collection_id)
            .bind(record.frame_index.map(|i| i as i64))
            .bind(record.record_type.as_str())
            .bind(&preset_json)
            .bind(&record.updated_at.to_rfc3339())
            .bind(&record.id)
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO svg_records (
                    id, name, svg_content, template_name, tags, params,
                    width, height, thumbnail, collection_id, frame_index,
                    record_type, preset_json, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&record.id)
            .bind(&record.name)
            .bind(&record.svg_content)
            .bind(&record.template_name)
            .bind(&tags_json)
            .bind(&params_json)
            .bind(record.width.map(|w| w as i64))
            .bind(record.height.map(|h| h as i64))
            .bind(&record.thumbnail)
            .bind(&record.collection_id)
            .bind(record.frame_index.map(|i| i as i64))
            .bind(record.record_type.as_str())
            .bind(&preset_json)
            .bind(&record.created_at.to_rfc3339())
            .bind(&record.updated_at.to_rfc3339())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// 拼出 `list` / `count` 共用的 WHERE 子句。值全部走绑定参数。
    fn build_filters<'a>(opts: &'a ListOptions) -> (String, Vec<String>) {
        let mut conditions: Vec<&'static str> = Vec::new();
        let mut binds: Vec<String> = Vec::new();

        if opts.tag.is_some() {
            conditions.push("tags LIKE ?");
        }
        if opts.collection_id.is_some() {
            conditions.push("collection_id = ?");
        }
        if opts.record_type.is_some() {
            conditions.push("record_type = ?");
        }
        if opts.uncollected {
            conditions.push("collection_id IS NULL");
        }

        if let Some(ref tag) = opts.tag {
            binds.push(format!("%{}%", tag));
        }
        if let Some(ref id) = opts.collection_id {
            binds.push(id.clone());
        }
        if let Some(kind) = opts.record_type {
            binds.push(kind.as_str().to_string());
        }

        let clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };
        (clause, binds)
    }

    pub async fn list(&self, opts: &ListOptions) -> Result<Vec<SvgRecord>> {
        let sort_col = match opts.sort_by.as_str() {
            "name" => "name",
            "updated_at" => "updated_at",
            "frame_index" => "frame_index",
            _ => "created_at",
        };
        let sort_dir = if opts.sort_order == "asc" { "ASC" } else { "DESC" };
        let (clause, binds) = Self::build_filters(opts);

        // 排序键来自白名单，不是用户输入，可以安全拼进 SQL
        let sql = format!(
            "SELECT * FROM svg_records {} ORDER BY {} {} LIMIT ? OFFSET ?",
            clause, sort_col, sort_dir
        );

        let mut q = sqlx::query_as::<_, SvgRow>(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        let rows = q.bind(opts.limit).bind(opts.offset).fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(SvgRow::into_record).collect())
    }

    pub async fn get(&self, id: &str) -> Result<Option<SvgRecord>> {
        let row = sqlx::query_as::<_, SvgRow>(
            "SELECT * FROM svg_records WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(SvgRow::into_record))
    }

    pub async fn search(&self, query: &str, tags: &[String]) -> Result<Vec<SvgRecord>> {
        let mut conditions = Vec::new();
        let mut binds: Vec<String> = Vec::new();

        if !query.is_empty() {
            conditions.push("(name LIKE ? OR svg_content LIKE ?)");
            binds.push(format!("%{}%", query));
            binds.push(format!("%{}%", query));
        }

        for tag in tags {
            conditions.push("tags LIKE ?");
            binds.push(format!("%{}%", tag));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let sql = format!("SELECT * FROM svg_records {} ORDER BY created_at DESC LIMIT 50", where_clause);

        let mut q = sqlx::query_as::<_, SvgRow>(&sql);
        for b in &binds {
            q = q.bind(b);
        }

        let rows = q.fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(SvgRow::into_record).collect())
    }

    /// 与 `list` 同样的过滤条件下统计总数。
    pub async fn count_filtered(&self, opts: &ListOptions) -> Result<i64> {
        let (clause, binds) = Self::build_filters(opts);
        let sql = format!("SELECT COUNT(*) as cnt FROM svg_records {}", clause);
        let mut q = sqlx::query_as::<_, CountRow>(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        let row = q.fetch_one(&self.pool).await?;
        Ok(row.cnt)
    }

    pub async fn delete(&self, id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM svg_records WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn count(&self) -> Result<i64> {
        let row = sqlx::query_as::<_, CountRow>("SELECT COUNT(*) as cnt FROM svg_records")
            .fetch_one(&self.pool)
            .await?;

        Ok(row.cnt)
    }

    // ────────────────────────────── 集合 ──────────────────────────────

    pub async fn save_collection(&self, c: &Collection) -> Result<()> {
        let tags_json = serde_json::to_string(&c.tags).unwrap_or_default();
        let preset_json = encode_preset(&c.preset);

        sqlx::query(
            r#"
            INSERT INTO collections (id, name, kind, tags, preset_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                kind = excluded.kind,
                tags = excluded.tags,
                preset_json = excluded.preset_json,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&c.id)
        .bind(&c.name)
        .bind(c.kind.as_str())
        .bind(&tags_json)
        .bind(&preset_json)
        .bind(&c.created_at.to_rfc3339())
        .bind(&c.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_collection(&self, id: &str) -> Result<Option<Collection>> {
        let row = sqlx::query_as::<_, CollectionRow>("SELECT * FROM collections WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(CollectionRow::into_collection))
    }

    pub async fn list_collections(&self) -> Result<Vec<CollectionSummary>> {
        // 用 LEFT JOIN 一次带出条目数，避免 N+1
        let rows = sqlx::query_as::<_, CollectionCountRow>(
            r#"
            SELECT c.*, COUNT(r.id) AS item_count
            FROM collections c
            LEFT JOIN svg_records r ON r.collection_id = c.id
            GROUP BY c.id
            ORDER BY c.created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.into_summary()).collect())
    }

    /// 删集合。条目不跟着删，只解绑（置 NULL）。
    pub async fn delete_collection(&self, id: &str) -> Result<bool> {
        sqlx::query("UPDATE svg_records SET collection_id = NULL WHERE collection_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        let result = sqlx::query("DELETE FROM collections WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 把一批条目挪进集合。
    pub async fn assign_to_collection(&self, collection_id: &str, ids: &[String]) -> Result<u64> {
        let mut affected = 0u64;
        for id in ids {
            let r = sqlx::query("UPDATE svg_records SET collection_id = ? WHERE id = ?")
                .bind(collection_id)
                .bind(id)
                .execute(&self.pool)
                .await?;
            affected += r.rows_affected();
        }
        Ok(affected)
    }

    // ──────────────────────── 整库导入导出 ────────────────────────

    pub async fn export_all(&self) -> Result<DatabaseExport> {
        let collections = sqlx::query_as::<_, CollectionRow>("SELECT * FROM collections")
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(CollectionRow::into_collection)
            .collect();

        let records = sqlx::query_as::<_, SvgRow>("SELECT * FROM svg_records")
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(SvgRow::into_record)
            .collect();

        Ok(DatabaseExport {
            version: EXPORT_FORMAT_VERSION,
            exported_at: chrono::Utc::now(),
            collections,
            records,
        })
    }

    /// 导入整库。`Replace` 会先清空两张表；`Merge` 按 id 覆盖或插入。
    pub async fn import_all(&self, bundle: DatabaseExport, mode: ImportMode) -> Result<ImportReport> {
        if bundle.version != EXPORT_FORMAT_VERSION {
            return Err(crate::error::AitmeowError::Validation(format!(
                "导出文件版本 {} 与当前支持的版本 {} 不一致",
                bundle.version, EXPORT_FORMAT_VERSION
            )));
        }

        let mut report = ImportReport::default();

        if mode == ImportMode::Replace {
            sqlx::query("DELETE FROM svg_records")
                .execute(&self.pool)
                .await?;
            sqlx::query("DELETE FROM collections")
                .execute(&self.pool)
                .await?;
        }

        for c in &bundle.collections {
            let exists = self.get_collection(&c.id).await?.is_some();
            self.save_collection(c).await?;
            if exists {
                report.collections_updated += 1;
            } else {
                report.collections_added += 1;
            }
        }

        for r in &bundle.records {
            let exists = self.get(&r.id).await?.is_some();
            self.save(r).await?;
            if exists {
                report.records_updated += 1;
            } else {
                report.records_added += 1;
            }
        }

        // 集合可能引用了不存在的条目：解绑悬空引用，避免仓库里出现空集合计数异常
        if mode == ImportMode::Replace {
            let orphaned = sqlx::query(
                "UPDATE svg_records SET collection_id = NULL \
                 WHERE collection_id IS NOT NULL \
                 AND collection_id NOT IN (SELECT id FROM collections)",
            )
            .execute(&self.pool)
            .await?;
            report.records_deleted = 0;
            let _ = orphaned;
        }

        Ok(report)
    }
}

/// 只放行 字母/数字/下划线 的标识符。
///
/// `PRAGMA table_info(...)` 和 `ALTER TABLE ... ADD COLUMN` 都不接受绑定参数，
/// 表名/列名只能拼进 SQL，所以拼之前先卡死字符集。
fn check_identifier(s: &str) -> Result<()> {
    if s.is_empty()
        || !s
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_')
    {
        return Err(crate::error::AitmeowError::Validation(format!(
            "非法的 SQL 标识符: {:?}",
            s
        )));
    }
    Ok(())
}

fn encode_preset(preset: &Option<crate::iconspec::IconSpec>) -> Option<String> {
    preset
        .as_ref()
        .and_then(|p| serde_json::to_string(p).ok())
}

#[derive(Debug, sqlx::FromRow)]
struct SvgRow {
    id: String,
    name: String,
    svg_content: String,
    template_name: Option<String>,
    tags: String,
    params: String,
    width: Option<i64>,
    height: Option<i64>,
    thumbnail: Option<Vec<u8>>,
    created_at: String,
    updated_at: String,
    collection_id: Option<String>,
    frame_index: Option<i64>,
    record_type: Option<String>,
    preset_json: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct CountRow {
    cnt: i64,
}


#[derive(Debug, sqlx::FromRow)]
struct CollectionRow {
    id: String,
    name: String,
    kind: Option<String>,
    tags: String,
    preset_json: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, sqlx::FromRow)]
struct CollectionCountRow {
    id: String,
    name: String,
    kind: Option<String>,
    tags: String,
    preset_json: Option<String>,
    created_at: String,
    updated_at: String,
    item_count: i64,
}

fn parse_time(s: &str) -> chrono::DateTime<chrono::Utc> {
    chrono::DateTime::parse_from_rfc3339(s)
        .unwrap_or_default()
        .with_timezone(&chrono::Utc)
}

impl SvgRow {
    fn into_record(self) -> SvgRecord {
        let tags: Vec<String> =
            serde_json::from_str(&self.tags).unwrap_or_default();
        let params: std::collections::HashMap<String, String> =
            serde_json::from_str(&self.params).unwrap_or_default();

        SvgRecord {
            id: self.id,
            name: self.name,
            svg_content: self.svg_content,
            template_name: self.template_name,
            tags,
            params,
            width: self.width.map(|w| w as u32),
            height: self.height.map(|h| h as u32),
            thumbnail: self.thumbnail,
            created_at: parse_time(&self.created_at),
            updated_at: parse_time(&self.updated_at),
            collection_id: self.collection_id,
            frame_index: self.frame_index.map(|i| i as u32),
            record_type: RecordType::parse(self.record_type.as_deref().unwrap_or("result")),
            preset: self
                .preset_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok()),
        }
    }
}

impl CollectionRow {
    fn into_collection(self) -> Collection {
        Collection {
            id: self.id,
            name: self.name,
            kind: CollectionKind::parse(self.kind.as_deref().unwrap_or("manual")),
            tags: serde_json::from_str(&self.tags).unwrap_or_default(),
            preset: self
                .preset_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok()),
            created_at: parse_time(&self.created_at),
            updated_at: parse_time(&self.updated_at),
        }
    }
}

impl CollectionCountRow {
    fn into_summary(self) -> CollectionSummary {
        CollectionSummary {
            id: self.id,
            name: self.name,
            kind: CollectionKind::parse(self.kind.as_deref().unwrap_or("manual")),
            tags: serde_json::from_str(&self.tags).unwrap_or_default(),
            preset: self
                .preset_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok()),
            created_at: parse_time(&self.created_at),
            updated_at: parse_time(&self.updated_at),
            item_count: self.item_count,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_save_and_get() {
        let repo = Repository::open_memory().await.unwrap();

        let record = SvgRecord::new(
            "test.svg".into(),
            "<svg></svg>".into(),
        )
        .with_tags(vec!["logo".into()]);

        repo.save(&record).await.unwrap();

        let fetched = repo.get(&record.id).await.unwrap().unwrap();
        assert_eq!(fetched.name, "test.svg");
        assert_eq!(fetched.tags, vec!["logo"]);
    }

    #[tokio::test]
    async fn test_list_and_search() {
        let repo = Repository::open_memory().await.unwrap();

        for i in 0..5 {
            let mut record = SvgRecord::new(
                format!("svg{}.svg", i),
                format!("<svg id='{}'></svg>", i),
            );
            record.tags = vec![if i % 2 == 0 {
                "even".into()
            } else {
                "odd".into()
            }];
            repo.save(&record).await.unwrap();
        }

        let list = repo.list(&ListOptions::default()).await.unwrap();
        assert_eq!(list.len(), 5);

        let results = repo.search("svg", &[]).await.unwrap();
        assert!(!results.is_empty());
        assert_eq!(results.len(), 5);
    }

    #[tokio::test]
    async fn test_delete() {
        let repo = Repository::open_memory().await.unwrap();
        let record = SvgRecord::new("to_delete".into(), "<svg/>".into());
        repo.save(&record).await.unwrap();

        assert!(repo.delete(&record.id).await.unwrap());
        assert!(repo.get(&record.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_new_columns_survive_roundtrip() {
        let repo = Repository::open_memory().await.unwrap();
        let spec = crate::iconspec::IconSpec {
            rotation: 30.0,
            safe_area: 0.8,
            ..Default::default()
        };
        let record = SvgRecord::new("frame".into(), "<svg/>".into())
            .with_collection("col-1")
            .with_frame(3)
            .with_record_type(RecordType::Asset)
            .with_preset(spec.clone());

        repo.save(&record).await.unwrap();
        let fetched = repo.get(&record.id).await.unwrap().unwrap();

        assert_eq!(fetched.collection_id.as_deref(), Some("col-1"));
        assert_eq!(fetched.frame_index, Some(3));
        assert_eq!(fetched.record_type, RecordType::Asset);
        assert_eq!(fetched.preset, Some(spec));
    }

    #[tokio::test]
    async fn test_migration_adds_columns_to_legacy_table() {
        // 模拟一张老表：只有老列，没有 collection_id 等
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("legacy.db");

        {
            let repo = Repository::open(&path).await.unwrap();
            sqlx::query("DROP TABLE svg_records")
                .execute(&repo.pool)
                .await
                .unwrap();
            sqlx::query(
                r#"CREATE TABLE svg_records (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    svg_content TEXT NOT NULL,
                    template_name TEXT,
                    tags TEXT NOT NULL DEFAULT '[]',
                    params TEXT NOT NULL DEFAULT '{}',
                    width INTEGER,
                    height INTEGER,
                    thumbnail BLOB,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )"#,
            )
            .execute(&repo.pool)
            .await
            .unwrap();
        }

        // 重新打开应触发增量加列，且老数据还在
        let repo = Repository::open(&path).await.unwrap();
        let legacy = sqlx::query(
            "INSERT INTO svg_records (id, name, svg_content, created_at, updated_at) \
             VALUES ('old-1', 'old.svg', '<svg/>', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        )
        .execute(&repo.pool)
        .await
        .unwrap();
        assert_eq!(legacy.rows_affected(), 1);

        let fetched = repo.get("old-1").await.unwrap().unwrap();
        assert_eq!(fetched.name, "old.svg");
        assert_eq!(fetched.record_type, RecordType::Result);
        assert_eq!(fetched.collection_id, None);
    }

    #[tokio::test]
    async fn test_collection_crud_and_item_count() {
        let repo = Repository::open_memory().await.unwrap();
        let c = Collection::new("App 图标", CollectionKind::Batch);
        repo.save_collection(&c).await.unwrap();

        for i in 0..3 {
            repo.save(&SvgRecord::new(format!("i{}", i), "<svg/>".into()).with_collection(&c.id))
                .await
                .unwrap();
        }

        let list = repo.list_collections().await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].item_count, 3);
        assert_eq!(list[0].kind, CollectionKind::Batch);

        // 改名
        let mut renamed = repo.get_collection(&c.id).await.unwrap().unwrap();
        renamed.name = "改名了".into();
        repo.save_collection(&renamed).await.unwrap();
        assert_eq!(
            repo.get_collection(&c.id).await.unwrap().unwrap().name,
            "改名了"
        );
    }

    #[tokio::test]
    async fn test_delete_collection_unbinds_items() {
        let repo = Repository::open_memory().await.unwrap();
        let c = Collection::new("tmp", CollectionKind::Manual);
        repo.save_collection(&c).await.unwrap();
        let r = SvgRecord::new("keep".into(), "<svg/>".into()).with_collection(&c.id);
        repo.save(&r).await.unwrap();

        assert!(repo.delete_collection(&c.id).await.unwrap());
        // 条目还在，只是解绑
        let kept = repo.get(&r.id).await.unwrap().unwrap();
        assert_eq!(kept.collection_id, None);
        assert!(repo.get_collection(&c.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_list_filters() {
        let repo = Repository::open_memory().await.unwrap();
        let c = Collection::new("set", CollectionKind::Frameset);
        repo.save_collection(&c).await.unwrap();

        repo.save(&SvgRecord::new("in".into(), "<svg/>".into()).with_collection(&c.id))
            .await
            .unwrap();
        repo.save(&SvgRecord::new("out".into(), "<svg/>".into()))
            .await
            .unwrap();
        repo.save(
            &SvgRecord::new("asset".into(), "<svg/>".into())
                .with_record_type(RecordType::Asset),
        )
        .await
        .unwrap();

        let in_set = repo
            .list(&ListOptions {
                collection_id: Some(c.id.clone()),
                ..Default::default()
            })
            .await
            .unwrap();
        assert_eq!(in_set.len(), 1);
        assert_eq!(in_set[0].name, "in");

        let assets = repo
            .list(&ListOptions {
                record_type: Some(RecordType::Asset),
                ..Default::default()
            })
            .await
            .unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].name, "asset");

        let loose = repo
            .list(&ListOptions {
                uncollected: true,
                ..Default::default()
            })
            .await
            .unwrap();
        assert_eq!(loose.len(), 2);

        // count 必须用同样的过滤条件，否则分页会算错
        assert_eq!(
            repo.count_filtered(&ListOptions {
                collection_id: Some(c.id.clone()),
                ..Default::default()
            })
            .await
            .unwrap(),
            1
        );
        assert_eq!(repo.count().await.unwrap(), 3);
    }

    #[tokio::test]
    async fn test_assign_to_collection() {
        let repo = Repository::open_memory().await.unwrap();
        let c = Collection::new("set", CollectionKind::Manual);
        repo.save_collection(&c).await.unwrap();
        let a = SvgRecord::new("a".into(), "<svg/>".into());
        let b = SvgRecord::new("b".into(), "<svg/>".into());
        repo.save(&a).await.unwrap();
        repo.save(&b).await.unwrap();

        let n = repo
            .assign_to_collection(&c.id, &[a.id.clone(), b.id.clone()])
            .await
            .unwrap();
        assert_eq!(n, 2);
        assert_eq!(
            repo.list_collections().await.unwrap()[0].item_count,
            2
        );
    }

    #[tokio::test]
    async fn test_export_import_replace() {
        let src = Repository::open_memory().await.unwrap();
        let c = Collection::new("批次", CollectionKind::Batch);
        src.save_collection(&c).await.unwrap();
        src.save(&SvgRecord::new("a".into(), "<svg a/>".into()).with_collection(&c.id))
            .await
            .unwrap();

        let bundle = src.export_all().await.unwrap();
        assert_eq!(bundle.version, EXPORT_FORMAT_VERSION);
        assert_eq!(bundle.collections.len(), 1);
        assert_eq!(bundle.records.len(), 1);

        let dst = Repository::open_memory().await.unwrap();
        // 目标库里先塞一条，Replace 应该把它清掉
        dst.save(&SvgRecord::new("stale".into(), "<svg/>".into()))
            .await
            .unwrap();

        let report = dst.import_all(bundle, ImportMode::Replace).await.unwrap();
        assert_eq!(report.collections_added, 1);
        assert_eq!(report.records_added, 1);

        let all = dst.list(&ListOptions::default()).await.unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "a");
        assert_eq!(all[0].collection_id.as_deref(), Some(c.id.as_str()));
    }

    #[tokio::test]
    async fn test_export_import_merge_keeps_existing() {
        let src = Repository::open_memory().await.unwrap();
        let r = SvgRecord::new("shared".into(), "<svg new/>".into());
        src.save(&r).await.unwrap();
        let bundle = src.export_all().await.unwrap();

        let dst = Repository::open_memory().await.unwrap();
        // 同 id 已存在，内容不同
        let mut old = SvgRecord::new("shared".into(), "<svg old/>".into());
        old.id = r.id.clone();
        dst.save(&old).await.unwrap();
        let keep = SvgRecord::new("only-local".into(), "<svg/>".into());
        dst.save(&keep).await.unwrap();

        let report = dst.import_all(bundle, ImportMode::Merge).await.unwrap();
        assert_eq!(report.records_updated, 1);
        assert_eq!(report.records_added, 0);

        // 同 id 被覆盖，本地独有的保留
        assert_eq!(
            dst.get(&r.id).await.unwrap().unwrap().svg_content,
            "<svg new/>"
        );
        assert!(dst.get(&keep.id).await.unwrap().is_some());
    }

    #[tokio::test]
    async fn test_import_rejects_version_mismatch() {
        let repo = Repository::open_memory().await.unwrap();
        let mut bundle = repo.export_all().await.unwrap();
        bundle.version = 999;
        assert!(repo.import_all(bundle, ImportMode::Merge).await.is_err());
    }

    #[tokio::test]
    async fn test_export_bundle_is_json_serializable() {
        let repo = Repository::open_memory().await.unwrap();
        repo.save(&SvgRecord::new("a".into(), "<svg/>".into()))
            .await
            .unwrap();
        let bundle = repo.export_all().await.unwrap();

        // 导出要能落盘成文件，这是"整库导出"的交付形式
        let json = serde_json::to_string_pretty(&bundle).unwrap();
        let back: DatabaseExport = serde_json::from_str(&json).unwrap();
        assert_eq!(back.records.len(), 1);
    }

    #[test]
    fn test_check_identifier_rejects_injection() {
        assert!(check_identifier("svg_records").is_ok());
        assert!(check_identifier("preset_json").is_ok());
        assert!(check_identifier("svg_records; DROP TABLE svg_records").is_err());
        assert!(check_identifier("").is_err());
        assert!(check_identifier("a b").is_err());
    }
}
