use crate::{docker::Result, model::*};
use rusqlite::{params, Connection};
use std::{os::unix::fs::PermissionsExt, path::Path};

pub struct Store {
    db: Connection,
}
impl Store {
    pub fn open(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            std::fs::set_permissions(parent, std::fs::Permissions::from_mode(0o700))
                .map_err(|e| e.to_string())?;
        }
        let db = Connection::open(path).map_err(|e| e.to_string())?;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
            .map_err(|e| e.to_string())?;
        let version: u32 = db
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if version > 2 {
            return Err(
                "History database was created by a newer application; refusing schema downgrade"
                    .into(),
            );
        }
        db.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS preferences (
               daemon TEXT NOT NULL, key TEXT NOT NULL, alias TEXT NOT NULL,
               project TEXT, protected INTEGER NOT NULL, PRIMARY KEY(daemon,key));
             CREATE TABLE IF NOT EXISTS snapshots (
               id TEXT PRIMARY KEY, daemon TEXT NOT NULL, at TEXT NOT NULL, data TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, at TEXT NOT NULL, data TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS observations (
               daemon TEXT NOT NULL, key TEXT NOT NULL, last_seen TEXT NOT NULL,
               last_active TEXT, last_source TEXT, PRIMARY KEY(daemon,key));"
        ).map_err(|e| e.to_string())?;
        if version == 1 {
            db.execute_batch("ALTER TABLE observations ADD COLUMN last_source TEXT;")
                .map_err(|e| e.to_string())?;
        }
        db.execute_batch("PRAGMA user_version=2;")
            .map_err(|e| e.to_string())?;
        Ok(Self { db })
    }
    pub fn apply(&self, daemon: &str, asset: &mut Asset) -> Result<()> {
        let mut stmt = self
            .db
            .prepare("SELECT alias,project,protected FROM preferences WHERE daemon=?1 AND key=?2")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query(params![daemon, asset.key])
            .map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            asset.alias = row.get(0).map_err(|e| e.to_string())?;
            let project: Option<String> = row.get(1).map_err(|e| e.to_string())?;
            if let Some(p) = project {
                asset.project = p;
                asset.evidence.push("User association (explicit)".into());
            }
            asset.protected = row.get(2).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    pub fn save_asset(
        &self,
        daemon: &str,
        key: &str,
        alias: &str,
        project: Option<&str>,
        protected: bool,
    ) -> Result<()> {
        if alias.len() > 256 || project.map(|s| s.len() > 1024).unwrap_or(false) {
            return Err("Alias/project is too long".into());
        }
        self.db
            .execute(
                "INSERT INTO preferences VALUES (?1,?2,?3,?4,?5)
            ON CONFLICT(daemon,key) DO UPDATE SET alias=excluded.alias,
            project=COALESCE(excluded.project,preferences.project),protected=excluded.protected",
                params![daemon, key, alias, project, protected],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn snapshot(&self, snapshot: &Snapshot) -> Result<()> {
        let data = serde_json::to_string(snapshot).map_err(|e| e.to_string())?;
        self.db
            .execute(
                "INSERT INTO snapshots VALUES (?1,?2,?3,?4)",
                params![snapshot.id, snapshot.daemon_id, snapshot.captured_at, data],
            )
            .map_err(|e| e.to_string())?;
        for a in &snapshot.assets {
            let (active, source) = if a.kind == "container" && a.state == "running" {
                (
                    Some(snapshot.captured_at.as_str()),
                    Some("Application-observed running state (monitoring gaps possible)"),
                )
            } else {
                (
                    a.last_used.as_deref(),
                    a.last_used.as_ref().map(|_| a.last_used_source.as_str()),
                )
            };
            self.db.execute(
                "INSERT INTO observations (daemon,key,last_seen,last_active,last_source) VALUES (?1,?2,?3,?4,?5)
                 ON CONFLICT(daemon,key) DO UPDATE SET last_seen=excluded.last_seen,
                 last_active=COALESCE(excluded.last_active,observations.last_active),
                 last_source=COALESCE(excluded.last_source,observations.last_source)",
                params![snapshot.daemon_id,a.key,snapshot.captured_at,active,source]).map_err(|e| e.to_string())?;
        }
        // Keep history bounded; cleanup results are retained separately.
        self.db.execute("DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY at DESC LIMIT 200)", []).map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn last_observed(&self, daemon: &str, key: &str) -> Option<(String, String)> {
        let (at, source) = self
            .db
            .query_row(
                "SELECT last_active,last_source FROM observations WHERE daemon=?1 AND key=?2",
                params![daemon, key],
                |r| {
                    Ok((
                        r.get::<_, Option<String>>(0)?,
                        r.get::<_, Option<String>>(1)?,
                    ))
                },
            )
            .ok()?;
        at.map(|at| {
            let source = source.unwrap_or("application activity; source unavailable".into());
            (
                at,
                if source.starts_with("Previously observed:") {
                    source
                } else {
                    format!("Previously observed: {source}")
                },
            )
        })
    }
    pub fn last_snapshot(&self, daemon: &str) -> Option<Snapshot> {
        let data: String = self
            .db
            .query_row(
                "SELECT data FROM snapshots WHERE daemon=?1 ORDER BY at DESC LIMIT 1",
                [daemon],
                |r| r.get(0),
            )
            .ok()?;
        serde_json::from_str(&data).ok()
    }
    pub fn save_result(&self, result: &CleanupResult) -> Result<()> {
        self.db
            .execute(
                "INSERT INTO results VALUES (?1,?2,?3)",
                params![
                    result.id,
                    result.at,
                    serde_json::to_string(result).map_err(|e| e.to_string())?
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn history(&self) -> Result<Vec<CleanupResult>> {
        let mut stmt = self
            .db
            .prepare("SELECT data FROM results ORDER BY at DESC LIMIT 100")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        rows.map(|row| {
            let data = row.map_err(|e| e.to_string())?;
            serde_json::from_str(&data).map_err(|e| e.to_string())
        })
        .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migrates_v1_and_refuses_future_schema() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("old.sqlite");
        let db = Connection::open(&path).unwrap();
        db.execute_batch("CREATE TABLE observations (daemon TEXT,key TEXT,last_seen TEXT,last_active TEXT,PRIMARY KEY(daemon,key));PRAGMA user_version=1;").unwrap();
        drop(db);
        let store = Store::open(&path).unwrap();
        let version: u32 = store
            .db
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 2);
        store.db.execute_batch("PRAGMA user_version=99;").unwrap();
        drop(store);
        assert!(Store::open(&path).is_err());
    }
    #[test]
    fn preferences_are_daemon_scoped() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(&dir.path().join("state.sqlite")).unwrap();
        store
            .save_asset("first", "volume:db", "keep", Some("project"), true)
            .unwrap();
        let mut a = Asset::new("volume", "db", "db");
        store.apply("second", &mut a).unwrap();
        assert!(!a.protected);
        assert!(a.alias.is_empty());
        store.apply("first", &mut a).unwrap();
        assert!(a.protected);
        assert_eq!(a.project, "project");
    }
}
