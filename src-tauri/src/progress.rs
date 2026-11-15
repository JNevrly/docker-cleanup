use crate::model::{Outcome, Plan};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ActionStatus {
    Queued,
    Checking,
    Deleting,
    Deleted,
    Failed,
    Skipped,
    Cancelled,
    Complete,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupProgress {
    pub operation_id: String,
    pub plan_id: String,
    pub key: Option<String>,
    pub name: Option<String>,
    pub phase: ActionStatus,
    pub completed: usize,
    pub total: usize,
    pub cache_scope: bool,
    pub message: String,
}

pub struct ProgressOutcomes<F: Fn(Value)> {
    plan: Plan,
    emit: F,
    pub entries: Vec<Outcome>,
}
impl<F: Fn(Value)> ProgressOutcomes<F> {
    pub fn new(plan: &Plan, emit: F) -> Self {
        let tracker = Self {
            plan: plan.clone(),
            emit,
            entries: vec![],
        };
        for i in 0..tracker.total() {
            tracker.status(i, ActionStatus::Queued, "Waiting for safety checks");
        }
        tracker
    }
    fn total(&self) -> usize {
        if self.plan.cache_scope {
            1
        } else {
            self.plan.actions.len()
        }
    }
    pub fn status(&self, index: usize, phase: ActionStatus, message: &str) {
        let action = self.plan.actions.get(index);
        (self.emit)(
            serde_json::to_value(CleanupProgress {
                operation_id: self.plan.id.clone(),
                plan_id: self.plan.id.clone(),
                key: Some(if self.plan.cache_scope {
                    "engine-cache".into()
                } else {
                    action.unwrap().key.clone()
                }),
                name: Some(if self.plan.cache_scope {
                    "Engine-wide eligible cache prune".into()
                } else {
                    action.unwrap().name.clone()
                }),
                phase,
                completed: self.entries.len(),
                total: self.total(),
                cache_scope: self.plan.cache_scope,
                message: message.into(),
            })
            .expect("progress serialization"),
        );
    }
    pub fn push(&mut self, mut outcome: Outcome) {
        if self.plan.cache_scope {
            outcome.key = "engine-cache".into();
        }
        let index = if self.plan.cache_scope {
            0
        } else {
            self.plan
                .actions
                .iter()
                .position(|a| a.key == outcome.key)
                .expect("reviewed action")
        };
        let phase = match outcome.status.as_str() {
            "deleted" => ActionStatus::Deleted,
            "failed" => ActionStatus::Failed,
            "skipped" => ActionStatus::Skipped,
            "cancelled" => ActionStatus::Cancelled,
            _ => unreachable!("terminal cleanup status"),
        };
        let message = outcome.message.clone();
        self.entries.push(outcome);
        self.status(index, phase, &message);
    }
    pub fn complete(&self, message: &str) {
        (self.emit)(
            serde_json::to_value(CleanupProgress {
                operation_id: self.plan.id.clone(),
                plan_id: self.plan.id.clone(),
                key: None,
                name: None,
                phase: ActionStatus::Complete,
                completed: self.total(),
                total: self.total(),
                cache_scope: self.plan.cache_scope,
                message: message.into(),
            })
            .expect("progress serialization"),
        );
    }
}
