use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mount {
    pub kind: String,
    pub source: String,
    pub destination: String,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub key: String,
    pub id: String,
    pub kind: String,
    pub name: String,
    pub bytes: Option<u64>,
    pub shared: Option<u64>,
    pub state: String,
    pub created: Option<String>,
    pub started: Option<String>,
    pub finished: Option<String>,
    pub last_used: Option<String>,
    pub last_used_source: String,
    pub refs: Vec<String>,
    pub mounts: Vec<Mount>,
    pub labels: BTreeMap<String, String>,
    pub project: String,
    pub evidence: Vec<String>,
    pub protected: bool,
    pub alias: String,
    pub ports: Vec<u16>,
}

impl Asset {
    pub fn new(kind: &str, id: &str, name: &str) -> Self {
        Self {
            key: format!("{kind}:{id}"),
            id: id.into(),
            kind: kind.into(),
            name: name.into(),
            bytes: None,
            shared: None,
            state: "unknown".into(),
            created: None,
            started: None,
            finished: None,
            last_used: None,
            last_used_source: "Unknown".into(),
            refs: vec![],
            mounts: vec![],
            labels: BTreeMap::new(),
            project: "Unattributed".into(),
            evidence: vec![],
            protected: false,
            alias: String::new(),
            ports: vec![],
        }
    }
    pub fn fingerprint(&self) -> String {
        // Deliberately ignore changing byte counts and application aliases.
        serde_json::json!([
            self.kind,
            self.id,
            self.name,
            self.created,
            self.state,
            self.refs,
            self.mounts,
            self.labels,
            self.protected
        ])
        .to_string()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub endpoint: String,
    pub daemon_id: String,
    pub captured_at: String,
    pub assets: Vec<Asset>,
    pub warnings: Vec<String>,
    pub capabilities: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Estimate {
    pub reported: u64,
    pub lower: u64,
    pub upper: Option<u64>,
    pub notes: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub key: String,
    pub id: String,
    pub kind: String,
    pub name: String,
    pub fingerprint: String,
    #[serde(default)]
    pub evidence: Vec<String>,
    #[serde(default)]
    pub retained_mounts: Vec<Mount>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub id: String,
    pub snapshot_id: String,
    pub daemon_id: String,
    pub created_at: String,
    pub actions: Vec<Action>,
    pub warnings: Vec<String>,
    pub estimate: Estimate,
    pub newly_eligible: Vec<String>,
    pub volumes: bool,
    pub cache_scope: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub key: String,
    pub status: String,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub id: String,
    pub at: String,
    pub plan: Plan,
    pub outcomes: Vec<Outcome>,
    pub before: Snapshot,
    pub after: Option<Snapshot>,
    pub reported_reclaimed: Option<u64>,
    pub host_free_delta: Option<i64>,
    pub notes: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Request {
    Scan {
        endpoint: String,
    },
    Snapshot,
    Inspect {
        key: String,
    },
    Diff {
        key: String,
    },
    Processes {
        key: String,
    },
    SaveAsset {
        key: String,
        alias: String,
        project: Option<String>,
        protected: bool,
    },
    Plan {
        keys: Vec<String>,
    },
    PrunePlan {
        scope: String,
        #[serde(rename = "olderThanDays")]
        older_than_days: Option<u32>,
    },
    Execute {
        #[serde(rename = "planId")]
        plan_id: String,
        confirmed: bool,
        #[serde(rename = "confirmVolumes")]
        confirm_volumes: bool,
        #[serde(rename = "confirmCacheScope")]
        confirm_cache_scope: bool,
    },
    History,
}

pub fn array(value: &Value) -> Vec<Value> {
    value.as_array().cloned().unwrap_or_default()
}
pub fn size(value: &Value) -> Option<u64> {
    value.as_u64()
}
pub fn timestamp(value: &Value) -> Option<String> {
    if let Some(s) = value.as_str() {
        if s.is_empty() || s.starts_with("0001-") {
            None
        } else {
            Some(s.into())
        }
    } else {
        value
            .as_i64()
            .and_then(|n| chrono::DateTime::from_timestamp(n, 0))
            .map(|t| t.to_rfc3339())
    }
}
