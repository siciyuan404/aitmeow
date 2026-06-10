use crate::error::Result;
use crate::repository::models::{ListOptions, SvgRecord};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Repository {
    pool: SqlitePool,
}

impl Repository {
    pub async fn open(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() && parent != Path::new("") {
                tokio::fs::create_dir_all(parent).await?;
            }
        }

        let conn_str = if path.to_str() == Some(":memory:") {
            "sqlite::memory:".to_string()
        } else {
            format!("sqlite:{}", path.display().to_string().replace('\\', "/"))
        };

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&conn_str)
            .await?;

        let repo = Self { pool };
        repo.migrate().await?;

        Ok(repo)
    }

    pub async fn open_memory() -> Result<Self> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
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

        Ok(())
    }

    pub async fn save(&self, record: &SvgRecord) -> Result<()> {
        let tags_json = serde_json::to_string(&record.tags).unwrap_or_default();
        let params_json = serde_json::to_string(&record.params).unwrap_or_default();

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
            .bind(&record.updated_at.to_rfc3339())
            .bind(&record.id)
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO svg_records (id, name, svg_content, template_name, tags, params, width, height, thumbnail, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            .bind(&record.created_at.to_rfc3339())
            .bind(&record.updated_at.to_rfc3339())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn list(&self, opts: &ListOptions) -> Result<Vec<SvgRecord>> {
        let sort_col = match opts.sort_by.as_str() {
            "name" => "name",
            "updated_at" => "updated_at",
            _ => "created_at",
        };
        let sort_dir = if opts.sort_order == "asc" { "ASC" } else { "DESC" };

        let rows = if let Some(ref tag) = opts.tag {
            sqlx::query_as::<_, SvgRow>(&format!(
                "SELECT * FROM svg_records WHERE tags LIKE ? ORDER BY {} {} LIMIT ? OFFSET ?",
                sort_col, sort_dir
            ))
            .bind(format!("%{}%", tag))
            .bind(opts.limit)
            .bind(opts.offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, SvgRow>(&format!(
                "SELECT * FROM svg_records ORDER BY {} {} LIMIT ? OFFSET ?",
                sort_col, sort_dir
            ))
            .bind(opts.limit)
            .bind(opts.offset)
            .fetch_all(&self.pool)
            .await?
        };

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
}

#[derive(Debug, sqlx::FromRow)]
struct CountRow {
    cnt: i64,
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
            created_at: chrono::DateTime::parse_from_rfc3339(&self.created_at)
                .unwrap_or_default()
                .with_timezone(&chrono::Utc),
            updated_at: chrono::DateTime::parse_from_rfc3339(&self.updated_at)
                .unwrap_or_default()
                .with_timezone(&chrono::Utc),
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
}
