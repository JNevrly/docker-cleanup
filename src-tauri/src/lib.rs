pub mod cleanup;
pub mod docker;
pub mod inventory;
pub mod model;
pub mod processes;
pub mod progress;
pub mod store;

use chrono::Utc;
use docker::{Docker, Result};
use model::*;
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
use store::Store;
use uuid::Uuid;

pub struct Service {
    store: Store,
    docker: Option<Docker>,
    snapshot: Option<Snapshot>,
    plans: BTreeMap<String, (Plan, Snapshot)>,
    pub cancelled: Arc<AtomicBool>,
}

impl Service {
    pub fn open(path: &Path, cancelled: Arc<AtomicBool>) -> Result<Self> {
        Ok(Self {
            store: Store::open(path)?,
            docker: None,
            snapshot: None,
            plans: BTreeMap::new(),
            cancelled,
        })
    }
    fn engine(&self) -> Result<&Docker> {
        self.docker
            .as_ref()
            .ok_or("Connect to a local Docker endpoint first".into())
    }
    fn asset(&self, key: &str) -> Result<Asset> {
        self.snapshot
            .as_ref()
            .and_then(|s| s.assets.iter().find(|a| a.key == key))
            .cloned()
            .ok_or("Asset missing; refresh inventory".into())
    }
    fn refresh(&mut self) -> Result<Snapshot> {
        let docker = self.engine()?.clone();
        // Reconnect for daemon identity checks; an endpoint may now refer to a
        // replacement daemon even though its socket path has not changed.
        let current = Docker::connect(&docker.endpoint)?;
        if current.identity != docker.identity {
            return Err("Daemon identity changed; reconnect and review a new inventory".into());
        }
        let snapshot = inventory::scan(&current, &self.store, || {
            self.cancelled.load(Ordering::Relaxed)
        })?;
        self.snapshot = Some(snapshot.clone());
        Ok(snapshot)
    }
    pub fn dispatch(&mut self, request: Request, progress: impl Fn(Value)) -> Result<Value> {
        self.cancelled.store(false, Ordering::Relaxed);
        self.dispatch_prepared(request, progress)
    }
    /// The desktop resets cancellation when accepting the IPC request, before
    /// queuing a worker. Do not erase a cancellation received while it queued.
    pub fn dispatch_prepared(
        &mut self,
        request: Request,
        progress: impl Fn(Value),
    ) -> Result<Value> {
        match request {
            Request::Scan { endpoint } => {
                progress(json!({"phase":"connecting","message":"Checking local Docker endpoint"}));
                let docker = Docker::connect(&endpoint)?;
                if self.docker.as_ref().map(|d| &d.identity) != Some(&docker.identity) {
                    self.plans.clear();
                    self.snapshot = None;
                }
                self.docker = Some(docker);
                progress(
                    json!({"phase":"scanning","message":"Reading inventory, sizes, references and history"}),
                );
                let snapshot = self.refresh()?;
                progress(
                    json!({"phase":"complete","message":format!("{} assets discovered",snapshot.assets.len())}),
                );
                Ok(json!(snapshot))
            }
            Request::Snapshot => Ok(json!(self.snapshot)),
            Request::Inspect { key } => inventory::inspect(self.engine()?, &self.asset(&key)?),
            Request::Diff { key } => inventory::diff(self.engine()?, &self.asset(&key)?),
            Request::Processes { key } => processes::collect(self.engine()?, &self.asset(&key)?),
            Request::SaveAsset {
                key,
                alias,
                project,
                protected,
            } => {
                self.asset(&key)?;
                self.store.save_asset(
                    &self.engine()?.identity,
                    &key,
                    &alias,
                    project.as_deref(),
                    protected,
                )?;
                self.plans.clear();
                Ok(json!(self.refresh()?))
            }
            Request::Plan { keys } => {
                progress(
                    json!({"phase":"review","message":"Refreshing references before cleanup planning"}),
                );
                let snapshot = self.refresh()?;
                let plan = cleanup::build_plan(&snapshot, &keys, false)?;
                self.plans.insert(plan.id.clone(), (plan.clone(), snapshot));
                Ok(json!(plan))
            }
            Request::PrunePlan {
                scope,
                older_than_days,
            } => {
                let snapshot = self.refresh()?;
                let (keys, cache) = cleanup::prune_keys(&snapshot, &scope, older_than_days)?;
                let mut plan = cleanup::build_plan(&snapshot, &keys, cache)?;
                plan.warnings.push("Object prune uses explicit reviewed targets to preserve protected assets, rather than unrestricted daemon bulk-prune. Age filters use finish/creation times, not universal last use; unknown timestamps are excluded.".into());
                self.plans.insert(plan.id.clone(), (plan.clone(), snapshot));
                Ok(json!(plan))
            }
            Request::Execute {
                plan_id,
                confirmed,
                confirm_volumes,
                confirm_cache_scope,
            } => Ok(json!(self.execute(
                &plan_id,
                confirmed,
                confirm_volumes,
                confirm_cache_scope,
                progress
            )?)),
            Request::History => Ok(json!(self.store.history()?)),
        }
    }
    fn execute(
        &mut self,
        id: &str,
        confirmed: bool,
        volumes: bool,
        cache: bool,
        progress: impl Fn(Value),
    ) -> Result<CleanupResult> {
        let (plan, before) = self
            .plans
            .get(id)
            .cloned()
            .ok_or("Plan expired or already consumed; review a new plan")?;
        if !confirmed || (plan.volumes && !volumes) || (plan.cache_scope && !cache) {
            return Err(
                "Explicit deletion and applicable volume/builder-scope confirmations are required"
                    .into(),
            );
        }
        // Consume after explicit confirmation. Each action revalidates daemon identity
        // and state before mutation, including a cancellation received in the worker queue.
        self.plans.remove(id);
        let mut outcomes = progress::ProgressOutcomes::new(&plan, &progress);
        let mut removed = BTreeSet::<String>::new();
        let mut failed = BTreeSet::<String>::new();
        let mut reclaimed = None;
        for (index, action) in plan.actions.iter().enumerate() {
            if plan.cache_scope && index > 0 {
                break;
            }
            if self.cancelled.load(Ordering::Relaxed) {
                outcomes.push(Outcome {key:action.key.clone(),status:"cancelled".into(),message:"No further operations scheduled; any completed/in-flight deletion cannot be rolled back".into()});
                continue;
            }
            outcomes.status(
                index,
                progress::ActionStatus::Checking,
                &format!("Revalidating {}", action.name),
            );
            let latest = match self.refresh() {
                Ok(s) => s,
                Err(e) => {
                    let cancelled = self.cancelled.load(Ordering::Relaxed);
                    outcomes.push(Outcome {
                        key: action.key.clone(),
                        status: if cancelled { "cancelled" } else { "failed" }.into(),
                        message: e,
                    });
                    if !cancelled {
                        failed.insert(action.key.clone());
                    }
                    continue;
                }
            };
            if self.cancelled.load(Ordering::Relaxed) {
                outcomes.push(Outcome {
                    key: action.key.clone(),
                    status: "cancelled".into(),
                    message: "Cancelled before scheduling deletion".into(),
                });
                continue;
            }
            if plan.cache_scope {
                let expected: BTreeSet<_> = plan.actions.iter().map(|a| a.key.clone()).collect();
                let actual: BTreeSet<_> = latest
                    .assets
                    .iter()
                    .filter(|a| a.kind == "cache")
                    .map(|a| a.key.clone())
                    .collect();
                if expected != actual
                    || latest.assets.iter().filter(|a| a.kind == "cache").any(|a| {
                        a.protected
                            || plan
                                .actions
                                .iter()
                                .find(|p| p.key == a.key)
                                .map(|p| &p.fingerprint)
                                != Some(&a.fingerprint())
                    })
                {
                    outcomes.push(Outcome {key:action.key.clone(),status:"failed".into(),message:"Builder scope changed or protected record appeared; renewed review required".into()});
                    break;
                }
                outcomes.status(
                    0,
                    progress::ActionStatus::Deleting,
                    "Pruning eligible Engine cache; duration and byte progress are unknown",
                );
                if self.cancelled.load(Ordering::Relaxed) {
                    outcomes.push(Outcome {
                        key: "engine-cache".into(),
                        status: "cancelled".into(),
                        message: "Cancelled before scheduling Engine prune".into(),
                    });
                    break;
                }
                let response = self.engine()?.call("POST", "/build/prune?all=true", None);
                match response {
                    Ok(v) => {
                        reclaimed = v["SpaceReclaimed"].as_u64();
                        outcomes.push(Outcome {key:"engine-cache".into(),status:"deleted".into(),message:"Engine-wide eligible builder cache pruned; in-use records retained by Docker".into()});
                    }
                    Err(e) => outcomes.push(Outcome {
                        key: "engine-cache".into(),
                        status: "failed".into(),
                        message: e,
                    }),
                }
                break;
            }
            let original = before
                .assets
                .iter()
                .find(|a| a.key == action.key)
                .ok_or("Plan asset missing")?;
            let mut expected = original.clone();
            expected.refs.retain(|r| !removed.contains(r));
            let found = latest.assets.iter().find(|a| a.key == action.key);
            let valid = found
                .map(|a| a.fingerprint() == expected.fingerprint())
                .unwrap_or(false);
            if !valid
                || latest
                    .assets
                    .iter()
                    .any(|a| a.state == "inspection-unavailable")
            {
                outcomes.push(Outcome {
                    key: action.key.clone(),
                    status: "failed".into(),
                    message: "Asset state/references/protection changed; renewed review required"
                        .into(),
                });
                failed.insert(action.key.clone());
                continue;
            }
            if original.refs.iter().any(|r| failed.contains(r)) {
                outcomes.push(Outcome {
                    key: action.key.clone(),
                    status: "skipped".into(),
                    message: "A prerequisite deletion failed".into(),
                });
                failed.insert(action.key.clone());
                continue;
            }
            if self.cancelled.load(Ordering::Relaxed) {
                outcomes.push(Outcome {
                    key: action.key.clone(),
                    status: "cancelled".into(),
                    message: "Cancelled before deletion".into(),
                });
                continue;
            }
            outcomes.status(
                index,
                progress::ActionStatus::Deleting,
                &format!("Deleting {}", action.name),
            );
            if self.cancelled.load(Ordering::Relaxed) {
                outcomes.push(Outcome {
                    key: action.key.clone(),
                    status: "cancelled".into(),
                    message: "Cancelled before scheduling deletion".into(),
                });
                continue;
            }
            match cleanup::remove(self.engine()?, action) {
                Ok(_) => {
                    removed.insert(action.key.clone());
                    outcomes.push(Outcome {
                        key: action.key.clone(),
                        status: "deleted".into(),
                        message: "Removed; unselected volumes and external bind mounts retained"
                            .into(),
                    });
                }
                Err(e) => {
                    failed.insert(action.key.clone());
                    outcomes.push(Outcome {
                        key: action.key.clone(),
                        status: "failed".into(),
                        message: e,
                    });
                }
            }
        }
        // Re-enable the verification scan even after scheduling cancellation.
        self.cancelled.store(false, Ordering::Relaxed);
        let after = self.refresh();
        let mut notes=vec![
            "Deletion is irreversible and partial success is possible; this result is not an undo record.".into(),
            "Host free-space delta is unavailable: the daemon filesystem cannot be reliably mapped into this application's mount namespace.".into(),
            "Individual object removal APIs do not report reclaimed bytes; before/after usage is separate from reported prune recovery and can include concurrent activity.".into(),
        ];
        if let Err(e) = &after {
            notes.push(format!("After-scan failed: {e}"));
        }
        let mut result = CleanupResult {
            id: Uuid::new_v4().to_string(),
            at: Utc::now().to_rfc3339(),
            plan: plan.clone(),
            outcomes: std::mem::take(&mut outcomes.entries),
            before,
            after: after.ok(),
            reported_reclaimed: reclaimed,
            host_free_delta: None,
            notes,
        };
        if let Err(error) = self.store.save_result(&result) {
            result.notes.push(format!("Cleanup outcomes could not be persisted: {error}. Keep this result; do not assume completed actions were rolled back."));
        }
        outcomes.complete("Cleanup finished; review per-action outcomes and persistence notes");
        Ok(result)
    }
}
