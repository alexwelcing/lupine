use crate::graph::{Edge, EdgeKind, Node, NodeKind, Provenance, Snapshot, Sphere, Status};
use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::str::FromStr;

pub struct WikiDb {
    conn: Connection,
}

impl WikiDb {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path).context("open wiki database")?;
        let mut db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    #[allow(dead_code)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory().context("open in-memory wiki database")?;
        let mut db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&mut self) -> Result<()> {
        self.conn
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS spheres (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    color TEXT,
                    priority INTEGER DEFAULT 0,
                    updated_at TEXT
                );

                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    sphere_id TEXT REFERENCES spheres(id),
                    kind TEXT NOT NULL,
                    name TEXT NOT NULL,
                    uri TEXT,
                    config_hash TEXT,
                    content TEXT,
                    status TEXT DEFAULT 'active',
                    provenance TEXT DEFAULT 'scanned',
                    owner_profile TEXT,
                    updated_at TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_nodes_sphere ON nodes(sphere_id);
                CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
                CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

                CREATE TABLE IF NOT EXISTS edges (
                    id TEXT PRIMARY KEY,
                    src_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
                    dst_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL,
                    provenance TEXT DEFAULT 'scanned',
                    metadata TEXT,
                    updated_at TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id);
                CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id);
                CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);

                CREATE TABLE IF NOT EXISTS snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    captured_at TEXT,
                    trigger TEXT,
                    sphere_hashes TEXT
                );

                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );

                INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');

                PRAGMA journal_mode = WAL;
                PRAGMA foreign_keys = ON;

                -- Migration: ensure schema_version exists even if tables predate meta
                UPDATE OR IGNORE meta SET value = '1' WHERE key = 'schema_version';

                -- View for full node summary
                CREATE VIEW IF NOT EXISTS v_nodes AS
                SELECT n.*, s.name AS sphere_name, s.color AS sphere_color
                FROM nodes n
                JOIN spheres s ON n.sphere_id = s.id;

                -- View for full edge summary
                CREATE VIEW IF NOT EXISTS v_edges AS
                SELECT e.*, src.name AS src_name, dst.name AS dst_name,
                       src_sphere.name AS src_sphere_name, dst_sphere.name AS dst_sphere_name
                FROM edges e
                JOIN nodes src ON e.src_id = src.id
                JOIN nodes dst ON e.dst_id = dst.id
                JOIN spheres src_sphere ON src.sphere_id = src_sphere.id
                JOIN spheres dst_sphere ON dst.sphere_id = dst_sphere.id;
                ")
            .context("run migrations")?;
        Ok(())
    }

    pub fn upsert_sphere(&mut self, sphere: &Sphere) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn
            .execute(
                "INSERT INTO spheres (id, name, description, color, priority, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                     name = excluded.name,
                     description = excluded.description,
                     color = excluded.color,
                     priority = excluded.priority,
                     updated_at = excluded.updated_at",
                params![
                    sphere.id,
                    sphere.name,
                    sphere.description,
                    sphere.color,
                    sphere.priority,
                    now
                ],
            )
            .context("upsert sphere")?;
        Ok(())
    }

    pub fn upsert_node(&mut self, node: &Node) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn
            .execute(
                "INSERT INTO nodes (id, sphere_id, kind, name, uri, config_hash, content, status, provenance, owner_profile, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                 ON CONFLICT(id) DO UPDATE SET
                     sphere_id = excluded.sphere_id,
                     kind = excluded.kind,
                     name = excluded.name,
                     uri = excluded.uri,
                     config_hash = excluded.config_hash,
                     content = excluded.content,
                     status = excluded.status,
                     provenance = excluded.provenance,
                     owner_profile = excluded.owner_profile,
                     updated_at = excluded.updated_at",
                params![
                    node.id,
                    node.sphere_id,
                    node.kind.as_str(),
                    node.name,
                    node.uri,
                    node.config_hash,
                    node.content,
                    node.status.as_str(),
                    node.provenance.as_str(),
                    node.owner_profile,
                    now,
                ],
            )
            .context("upsert node")?;
        Ok(())
    }

    pub fn upsert_edge(&mut self, edge: &Edge) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn
            .execute(
                "INSERT INTO edges (id, src_id, dst_id, kind, provenance, metadata, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                     kind = excluded.kind,
                     provenance = excluded.provenance,
                     metadata = excluded.metadata,
                     updated_at = excluded.updated_at",
                params![
                    edge.id,
                    edge.src_id,
                    edge.dst_id,
                    edge.kind.as_str(),
                    edge.provenance.as_str(),
                    edge.metadata,
                    now,
                ],
            )
            .context("upsert edge")?;
        Ok(())
    }

    pub fn get_spheres(&self) -> Result<Vec<Sphere>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, description, color, priority, updated_at FROM spheres ORDER BY priority DESC, name")?;
        let spheres = stmt
            .query_map([], |row| {
                Ok(Sphere {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    color: row.get(3)?,
                    priority: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(spheres)
    }

    pub fn get_nodes(&self, sphere: Option<&str>, kind: Option<NodeKind>, status: Option<Status>) -> Result<Vec<Node>> {
        let mut sql = String::from(
            "SELECT id, sphere_id, kind, name, uri, config_hash, content, status, provenance, owner_profile, updated_at FROM nodes WHERE 1=1",
        );
        if sphere.is_some() {
            sql.push_str(" AND sphere_id = ?");
        }
        if kind.is_some() {
            sql.push_str(" AND kind = ?");
        }
        if status.is_some() {
            sql.push_str(" AND status = ?");
        }
        sql.push_str(" ORDER BY sphere_id, kind, name");

        let mut stmt = self.conn.prepare(&sql)?;
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(s) = sphere {
            params.push(Box::new(s.to_string()));
        }
        if let Some(k) = kind {
            params.push(Box::new(k.as_str().to_string()));
        }
        if let Some(s) = status {
            params.push(Box::new(s.as_str().to_string()));
        }
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        let nodes = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(Node {
                    id: row.get(0)?,
                    sphere_id: row.get(1)?,
                    kind: NodeKind::from_str(&row.get::<_, String>(2)?).unwrap_or(NodeKind::Unknown),
                    name: row.get(3)?,
                    uri: row.get(4)?,
                    config_hash: row.get(5)?,
                    content: row.get(6)?,
                    status: Status::from_str(&row.get::<_, String>(7)?).unwrap_or(Status::Active),
                    provenance: Provenance::from_str(&row.get::<_, String>(8)?).unwrap_or(Provenance::Scanned),
                    owner_profile: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(nodes)
    }

    pub fn get_edges(&self, src: Option<&str>, dst: Option<&str>, kind: Option<EdgeKind>) -> Result<Vec<Edge>> {
        let mut sql = String::from("SELECT id, src_id, dst_id, kind, provenance, metadata, updated_at FROM edges WHERE 1=1");
        if src.is_some() {
            sql.push_str(" AND src_id = ?");
        }
        if dst.is_some() {
            sql.push_str(" AND dst_id = ?");
        }
        if kind.is_some() {
            sql.push_str(" AND kind = ?");
        }
        sql.push_str(" ORDER BY src_id, kind, dst_id");

        let mut stmt = self.conn.prepare(&sql)?;
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(s) = src {
            params.push(Box::new(s.to_string()));
        }
        if let Some(d) = dst {
            params.push(Box::new(d.to_string()));
        }
        if let Some(k) = kind {
            params.push(Box::new(k.as_str().to_string()));
        }
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        let edges = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(Edge {
                    id: row.get(0)?,
                    src_id: row.get(1)?,
                    dst_id: row.get(2)?,
                    kind: EdgeKind::from_str(&row.get::<_, String>(3)?).unwrap_or(EdgeKind::BelongsTo),
                    provenance: Provenance::from_str(&row.get::<_, String>(4)?).unwrap_or(Provenance::Scanned),
                    metadata: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(edges)
    }

    pub fn create_snapshot(&mut self, trigger: &str) -> Result<i64> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut stmt = self
            .conn
            .prepare("SELECT sphere_id, COUNT(*) FROM nodes GROUP BY sphere_id")?;
        let counts: serde_json::Map<String, serde_json::Value> = stmt
            .query_map([], |row| {
                let sphere_id: String = row.get(0)?;
                let count: i64 = row.get(1)?;
                Ok((sphere_id, serde_json::json!(count)))
            })?
            .collect::<Result<_, _>>()?;
        let hashes = serde_json::Value::Object(counts);
        self.conn.execute(
            "INSERT INTO snapshots (captured_at, trigger, sphere_hashes) VALUES (?1, ?2, ?3)",
            params![now, trigger, hashes.to_string()],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_snapshots(&self, limit: usize) -> Result<Vec<Snapshot>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, captured_at, trigger, sphere_hashes FROM snapshots ORDER BY id DESC LIMIT ?1")?;
        let snapshots = stmt
            .query_map([limit], |row| {
                Ok(Snapshot {
                    id: row.get(0)?,
                    captured_at: row.get(1)?,
                    trigger: row.get(2)?,
                    sphere_hashes: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(snapshots)
    }

    pub fn get_snapshot_by_id(&self, id: i64) -> Result<Option<Snapshot>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, captured_at, trigger, sphere_hashes FROM snapshots WHERE id = ?1")?;
        let snapshot = stmt
            .query_row([id], |row| {
                Ok(Snapshot {
                    id: row.get(0)?,
                    captured_at: row.get(1)?,
                    trigger: row.get(2)?,
                    sphere_hashes: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                })
            })
            .optional()?;
        Ok(snapshot)
    }

    pub fn delete_nodes_not_in(&mut self, sphere_id: &str, retained_ids: &[String]) -> Result<usize> {
        if retained_ids.is_empty() {
            let n = self
                .conn
                .execute("DELETE FROM nodes WHERE sphere_id = ?1", [sphere_id])?;
            return Ok(n);
        }
        let placeholders: Vec<String> = retained_ids.iter().map(|_| "?".to_string()).collect();
        let sql = format!(
            "DELETE FROM nodes WHERE sphere_id = ?1 AND id NOT IN ({})",
            placeholders.join(",")
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        params.push(Box::new(sphere_id.to_string()));
        for id in retained_ids {
            params.push(Box::new(id.clone()));
        }
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let n = self.conn.execute(&sql, param_refs.as_slice())?;
        Ok(n)
    }

    pub fn delete_edges_not_in(&mut self, sphere_id: &str, retained_ids: &[String]) -> Result<usize> {
        if retained_ids.is_empty() {
            let n = self
                .conn
                .execute(
                    "DELETE FROM edges WHERE src_id IN (SELECT id FROM nodes WHERE sphere_id = ?1)",
                    [sphere_id],
                )?;
            return Ok(n);
        }
        let placeholders: Vec<String> = retained_ids.iter().map(|_| "?".to_string()).collect();
        let sql = format!(
            "DELETE FROM edges WHERE src_id IN (SELECT id FROM nodes WHERE sphere_id = ?1) AND id NOT IN ({})",
            placeholders.join(",")
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        params.push(Box::new(sphere_id.to_string()));
        for id in retained_ids {
            params.push(Box::new(id.clone()));
        }
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let n = self.conn.execute(&sql, param_refs.as_slice())?;
        Ok(n)
    }

    pub fn begin_transaction(&mut self) -> Result<()> {
        self.conn.execute("BEGIN", [])?;
        Ok(())
    }

    pub fn commit_transaction(&mut self) -> Result<()> {
        self.conn.execute("COMMIT", [])?;
        Ok(())
    }
}
