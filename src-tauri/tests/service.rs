use docker_cleanup::progress::CleanupProgress;
use docker_cleanup::{model::Request, Service};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    io::{Read, Write},
    os::unix::net::UnixListener,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
};

struct Fixture {
    temp: tempfile::TempDir,
    endpoint: String,
    calls: Arc<Mutex<Vec<String>>>,
    responses: Arc<Mutex<BTreeMap<String, (u16, Value)>>>,
    _thread: thread::JoinHandle<()>,
}
impl Fixture {
    fn new() -> Self {
        let temp = tempfile::tempdir().unwrap();
        let socket = temp.path().join("docker.sock");
        let listener = UnixListener::bind(&socket).unwrap();
        let calls = Arc::new(Mutex::new(vec![]));
        let mut responses = BTreeMap::new();
        responses.insert(
            "/version".into(),
            (
                200,
                json!({"Os":"linux","ApiVersion":"1.56","MinAPIVersion":"1.44"}),
            ),
        );
        responses.insert(
            "/v1.56/info".into(),
            (200, json!({"ID":"fixture-daemon","Labels":[]})),
        );
        responses.insert("/v1.56/system/df".into(),(200,json!({
            "LayersSize":150,"Images":[{"Id":"sha256:img","RepoTags":["fixture:latest"],"Size":150,"SharedSize":50,"Created":1700000000}],
            "Volumes":[{"Name":"database","UsageData":{"Size":80}}],"BuildCache":[]
        })));
        responses.insert("/v1.56/containers/json?all=true&size=true".into(),(200,json!([
            {"Id":"old","Names":["/objective_bartik"],"State":"exited","SizeRw":100,"Created":1700000000,
             "Labels":{"devcontainer.local_folder":"/home/user/project"}},
            {"Id":"running","Names":["/api-dev"],"State":"running","SizeRw":5,"Created":1700000000}
        ])));
        for id in ["old", "running"] {
            responses.insert(format!("/v1.56/containers/{id}/json?size=true"),(200,json!({
                "Image":"sha256:img","Config":{"Image":"fixture:latest","Cmd":["sleep","infinity"],"Env":["SECRET=hidden"]},
                "State":{"StartedAt":"2026-01-01T00:00:00Z","FinishedAt":"2026-02-01T00:00:00Z"},
                "Mounts":[{"Type":"volume","Name":"database","Source":"/docker/volume","Destination":"/data"},
                    {"Type":"bind","Source":"/home/user/project","Destination":"/workspaces/project"}]
            })));
        }
        responses.insert(
            "/v1.56/volumes".into(),
            (
                200,
                json!({"Volumes":[{"Name":"database","CreatedAt":"2025-01-01T00:00:00Z"}]}),
            ),
        );
        responses.insert(
            "/v1.56/containers/old/changes".into(),
            (200, json!([{"Path":"/scratch/work","Kind":1}])),
        );
        responses.insert(
            "/v1.56/containers/old/json".into(),
            (
                200,
                json!({"Config":{"Env":["SECRET=hidden"],"Image":"fixture:latest"}}),
            ),
        );
        responses.insert(
            "/v1.56/containers/old?force=false&v=false".into(),
            (204, Value::Null),
        );
        let responses = Arc::new(Mutex::new(responses));
        let rc = responses.clone();
        let cc = calls.clone();
        let handle = thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(mut stream) = stream else { break };
                let mut bytes = vec![];
                loop {
                    let mut buf = [0; 1024];
                    let n = stream.read(&mut buf).unwrap();
                    if n == 0 {
                        break;
                    }
                    bytes.extend_from_slice(&buf[..n]);
                    if bytes.windows(4).any(|w| w == b"\r\n\r\n") {
                        break;
                    }
                }
                let text = String::from_utf8_lossy(&bytes);
                let mut parts = text.split_whitespace();
                let method = parts.next().unwrap_or("");
                let path = parts.next().unwrap_or("");
                cc.lock().unwrap().push(format!("{method} {path}"));
                let (status, value) = if path.contains("/events?") {
                    (200, json!([]))
                } else {
                    rc.lock()
                        .unwrap()
                        .get(path)
                        .cloned()
                        .unwrap_or((404, json!({"message":"fixture endpoint missing"})))
                };
                if status == 204 && method == "DELETE" {
                    if let Some(id) = path
                        .strip_prefix("/v1.56/containers/")
                        .and_then(|s| s.split('?').next())
                    {
                        if let Some((_, list)) = rc
                            .lock()
                            .unwrap()
                            .get_mut("/v1.56/containers/json?all=true&size=true")
                        {
                            list.as_array_mut().unwrap().retain(|v| v["Id"] != id);
                        }
                    }
                }
                let body = if path.contains("/events?") {
                    rc.lock()
                        .unwrap()
                        .get("EVENTS")
                        .map(|(_, v)| {
                            v.as_array()
                                .unwrap()
                                .iter()
                                .map(|e| format!("{e}\n"))
                                .collect::<String>()
                        })
                        .unwrap_or_default()
                } else if status == 204 {
                    String::new()
                } else {
                    value.to_string()
                };
                let response = format!(
                    "HTTP/1.1 {status} OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes());
            }
        });
        Self {
            endpoint: format!("unix://{}", socket.display()),
            temp,
            calls,
            responses,
            _thread: handle,
        }
    }
    fn service(&self) -> Service {
        Service::open(
            &self.temp.path().join("history.sqlite"),
            Arc::new(AtomicBool::new(false)),
        )
        .unwrap()
    }
    fn scan(&self, service: &mut Service) -> Value {
        service
            .dispatch(
                Request::Scan {
                    endpoint: self.endpoint.clone(),
                },
                |_| {},
            )
            .unwrap()
    }
}

#[test]
fn scan_inspect_diff_and_processes_do_not_mutate_daemon() {
    let f = Fixture::new();
    let mut s = f.service();
    let mut events = vec![];
    // Callback is shared rather than mutable, matching Tauri progress emission.
    let progress = Mutex::new(&mut events);
    let snapshot = s
        .dispatch(
            Request::Scan {
                endpoint: f.endpoint.clone(),
            },
            |v| progress.lock().unwrap().push(v),
        )
        .unwrap();
    assert_eq!(snapshot["assets"][0]["project"], "/home/user/project");
    assert_eq!(
        snapshot["assets"][0]["mounts"][1]["source"],
        "/home/user/project"
    );
    assert!(!events.is_empty());
    let meta = s
        .dispatch(
            Request::Inspect {
                key: "container:old".into(),
            },
            |_| {},
        )
        .unwrap();
    assert!(meta["Config"].get("Env").is_none());
    assert!(s
        .dispatch(
            Request::Diff {
                key: "container:old".into()
            },
            |_| {}
        )
        .is_ok());
    let p = s
        .dispatch(
            Request::Processes {
                key: "container:old".into(),
            },
            |_| {},
        )
        .unwrap();
    assert!(p["container"].is_null());
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

fn assert_progress_matches(events: &[Value], result: &Value) {
    let terminal: Vec<_> = events
        .iter()
        .filter(|e| {
            matches!(
                e["phase"].as_str(),
                Some("deleted" | "failed" | "skipped" | "cancelled")
            )
        })
        .collect();
    assert_eq!(terminal.len(), result["outcomes"].as_array().unwrap().len());
    for (event, outcome) in terminal.iter().zip(result["outcomes"].as_array().unwrap()) {
        assert_eq!(event["key"], outcome["key"]);
        assert_eq!(event["phase"], outcome["status"]);
        assert_eq!(event["message"], outcome["message"]);
    }
    for event in events {
        let typed: CleanupProgress = serde_json::from_value(event.clone()).unwrap();
        assert_eq!(typed.plan_id, result["plan"]["id"].as_str().unwrap());
        assert_eq!(typed.operation_id, typed.plan_id);
        assert!(typed.completed <= typed.total);
        assert!(event.get("bytes").is_none() && event.get("percent").is_none());
    }
    assert_eq!(events.last().unwrap()["phase"], "complete");
    assert_eq!(
        events.last().unwrap()["completed"],
        events.last().unwrap()["total"]
    );
}

#[test]
fn typed_progress_orders_actions_counts_outcomes_and_prevents_replay() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    let events = Mutex::new(vec![]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |event| events.lock().unwrap().push(event),
        )
        .unwrap();
    let events = events.into_inner().unwrap();
    assert_eq!(
        events
            .iter()
            .map(|e| e["phase"].as_str().unwrap())
            .collect::<Vec<_>>(),
        vec!["queued", "checking", "deleting", "deleted", "complete"]
    );
    assert_eq!(events[2]["completed"], 0);
    assert_eq!(events[3]["completed"], 1);
    assert_progress_matches(&events, &result);
    assert!(s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false
            },
            |_| {}
        )
        .is_err());
}

#[test]
fn queued_worker_cancellation_returns_terminal_progress_without_deletion() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    s.cancelled.store(true, Ordering::Relaxed);
    let events = Mutex::new(vec![]);
    let result = s
        .dispatch_prepared(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |e| events.lock().unwrap().push(e),
        )
        .unwrap();
    let events = events.into_inner().unwrap();
    assert_eq!(result["outcomes"][0]["status"], "cancelled");
    assert_eq!(
        events
            .iter()
            .map(|e| e["phase"].as_str().unwrap())
            .collect::<Vec<_>>(),
        vec!["queued", "cancelled", "complete"]
    );
    assert_progress_matches(&events, &result);
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|c| c.starts_with("GET ")));
}

#[test]
fn cache_capability_distinguishes_empty_unsupported_and_unavailable() {
    let f = Fixture::new();
    let mut s = f.service();
    assert_eq!(f.scan(&mut s)["capabilities"]["cache"], "available");
    f.responses
        .lock()
        .unwrap()
        .insert("/v1.56/system/df".into(), (200, json!({})));
    assert_eq!(f.scan(&mut s)["capabilities"]["cache"], "unsupported");
    f.responses.lock().unwrap().insert(
        "/v1.56/system/df".into(),
        (403, json!({"message":"permission denied"})),
    );
    assert_eq!(f.scan(&mut s)["capabilities"]["cache"], "unavailable");
}

#[test]
fn protection_persists_and_is_scoped_to_daemon() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    s.dispatch(
        Request::SaveAsset {
            key: "container:old".into(),
            alias: "My workspace".into(),
            project: Some("custom".into()),
            protected: true,
        },
        |_| {},
    )
    .unwrap();
    drop(s);
    let mut s = f.service();
    let snapshot = f.scan(&mut s);
    assert_eq!(snapshot["assets"][0]["protected"], true);
    assert_eq!(snapshot["assets"][0]["alias"], "My workspace");
    s.dispatch(
        Request::SaveAsset {
            key: "container:old".into(),
            alias: "My workspace".into(),
            project: None,
            protected: false,
        },
        |_| {},
    )
    .unwrap();
    let snapshot = s.dispatch(Request::Snapshot, |_| {}).unwrap();
    assert_eq!(snapshot["assets"][0]["project"], "custom");
}

#[test]
fn unsafe_targets_and_unconfirmed_execution_never_delete() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    for key in [
        "container:running",
        "volume:database",
        "image:sha256:img",
        "shared:image-layers",
    ] {
        assert!(s
            .dispatch(
                Request::Plan {
                    keys: vec![key.into()]
                },
                |_| {}
            )
            .is_err());
    }
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    assert!(s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: false,
                confirm_volumes: false,
                confirm_cache_scope: false
            },
            |_| {}
        )
        .is_err());
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn stale_plan_and_permission_failure_cannot_hide_partial_results() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/old?force=false&v=false".into(),
        (403, json!({"message":"denied"})),
    );
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert!(result["outcomes"][0]["message"]
        .as_str()
        .unwrap()
        .contains("permission-denied"));
    assert_eq!(
        s.dispatch(Request::History, |_| {})
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    // Consumed plans cannot be replayed.
    assert!(s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false
            },
            |_| {}
        )
        .is_err());
}

#[test]
fn changed_references_require_new_review() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/containers/old/json?size=true")
        .unwrap()
        .1["Mounts"] = json!([]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn cancellation_stops_scheduling_before_deletion() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    let cancelled = s.cancelled.clone();
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |event| {
                if event["phase"] == "deleting" {
                    cancelled.store(true, Ordering::Relaxed);
                }
            },
        )
        .unwrap();
    assert_ne!(result["outcomes"][0]["status"], "deleted");
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn new_volume_reference_invalidates_review() {
    let f = Fixture::new();
    for id in ["old", "running"] {
        f.responses
            .lock()
            .unwrap()
            .get_mut(&format!("/v1.56/containers/{id}/json?size=true"))
            .unwrap()
            .1["Mounts"] = json!([]);
    }
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["volume:database".into()],
            },
            |_| {},
        )
        .unwrap();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/containers/old/json?size=true")
        .unwrap()
        .1["Mounts"] = json!([{"Type":"volume","Name":"database","Destination":"/data"}]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: true,
                confirm_cache_scope: false,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn partial_failure_reports_both_success_and_failure_without_force() {
    let f = Fixture::new();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/containers/json?all=true&size=true")
        .unwrap()
        .1[1]["State"] = json!("exited");
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/old?force=false&v=false".into(),
        (403, json!({"message":"denied"})),
    );
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/running?force=false&v=false".into(),
        (204, Value::Null),
    );
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into(), "container:running".into()],
            },
            |_| {},
        )
        .unwrap();
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert_eq!(result["outcomes"][1]["status"], "deleted");
    for call in f
        .calls
        .lock()
        .unwrap()
        .iter()
        .filter(|c| !c.starts_with("GET "))
    {
        assert!(call.ends_with("?force=false&v=false"));
    }
}

#[test]
fn explicit_cache_scope_and_reclaim_report() {
    let f = Fixture::new();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/system/df")
        .unwrap()
        .1["BuildCache"] = json!([{"ID":"cache-a","Size":20,"Shared":false,"InUse":false},{"ID":"cache-b","Size":5,"Shared":false,"InUse":false}]);
    f.responses.lock().unwrap().insert(
        "/v1.56/build/prune?all=true".into(),
        (200, json!({"SpaceReclaimed":20})),
    );
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::PrunePlan {
                scope: "cache".into(),
                older_than_days: None,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(plan["cacheScope"], true);
    assert!(s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false
            },
            |_| {}
        )
        .is_err());
    let events = Mutex::new(vec![]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: true,
            },
            |e| events.lock().unwrap().push(e),
        )
        .unwrap();
    assert_eq!(result["reportedReclaimed"], 20);
    let events = events.into_inner().unwrap();
    assert_progress_matches(&events, &result);
    assert!(events.iter().all(|e| e["total"] == 1));
    assert!(events
        .iter()
        .filter(|e| e["key"] != "engine-cache")
        .all(|e| e["phase"] == "complete"));
    assert!(f
        .calls
        .lock()
        .unwrap()
        .contains(&"POST /v1.56/build/prune?all=true".into()));
}

#[test]
fn changed_cache_scope_needs_renewed_confirmation() {
    let f = Fixture::new();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/system/df")
        .unwrap()
        .1["BuildCache"] = json!([{"ID":"cache-a","Size":20,"Shared":false,"InUse":false}]);
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::PrunePlan {
                scope: "cache".into(),
                older_than_days: None,
            },
            |_| {},
        )
        .unwrap();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/system/df")
        .unwrap()
        .1["BuildCache"]
        .as_array_mut()
        .unwrap()
        .push(json!({"ID":"new-cache","Size":10,"InUse":false}));
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: true,
            },
            |_| {},
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn cancelled_scan_retains_previous_inventory() {
    let f = Fixture::new();
    let mut s = f.service();
    let first = f.scan(&mut s);
    let cancelled = s.cancelled.clone();
    assert!(s
        .dispatch(
            Request::Scan {
                endpoint: f.endpoint.clone()
            },
            |v| {
                if v["phase"] == "scanning" {
                    cancelled.store(true, Ordering::Relaxed);
                }
            }
        )
        .is_err());
    assert_eq!(
        s.dispatch(Request::Snapshot, |_| {}).unwrap()["id"],
        first["id"]
    );
}

#[test]
fn missing_inspection_does_not_turn_references_into_unused_assets() {
    let f = Fixture::new();
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/old/json?size=true".into(),
        (403, json!({"message":"denied"})),
    );
    let mut s = f.service();
    let snapshot = f.scan(&mut s);
    assert_eq!(snapshot["assets"][0]["state"], "inspection-unavailable");
    assert!(s
        .dispatch(
            Request::PrunePlan {
                scope: "images".into(),
                older_than_days: None
            },
            |_| {}
        )
        .is_err());
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn local_process_and_tcp_evidence_has_pid_and_no_arguments() {
    use std::net::{TcpListener, TcpStream};
    let f = Fixture::new();
    let docker = docker_cleanup::docker::Docker::connect(&f.endpoint).unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let _client = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
    let mut asset = docker_cleanup::model::Asset::new("container", "old", "fixture");
    asset.state = "exited".into();
    asset.ports = vec![listener.local_addr().unwrap().port()];
    asset.mounts.push(docker_cleanup::model::Mount {
        kind: "bind".into(),
        source: std::env::current_dir().unwrap().display().to_string(),
        destination: "/workspace".into(),
        name: String::new(),
    });
    let result = docker_cleanup::processes::collect(&docker, &asset).unwrap();
    let me = result["host"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["pid"].as_str().and_then(|s| s.parse::<u32>().ok()) == Some(std::process::id()))
        .unwrap();
    assert!(me["program"].is_string());
    assert!(me["evidence"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e.as_str().unwrap().contains("TCP client")));
    assert!(me.get("args").is_none());
    assert!(me.get("env").is_none());
}

#[test]
fn missing_volume_size_and_cache_usage_are_not_fabricated_zeroes() {
    let f = Fixture::new();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/system/df")
        .unwrap()
        .1["Volumes"][0]["UsageData"]["Size"] = json!(-1);
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/system/df")
        .unwrap()
        .1["BuildCache"] = json!([{"ID":"cache-a","InUse":false,"Size":-1}]);
    let mut s = f.service();
    let snapshot = f.scan(&mut s);
    for id in ["database", "cache-a"] {
        let asset = snapshot["assets"]
            .as_array()
            .unwrap()
            .iter()
            .find(|a| a["id"] == id)
            .unwrap();
        assert!(asset["bytes"].is_null());
        assert!(asset["lastUsed"].is_null());
    }
}

#[test]
fn event_timestamp_provenance_survives_later_scans() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    f.responses.lock().unwrap().insert("EVENTS".into(),(200,json!([{
        "Type":"volume","Action":"mount","Actor":{"ID":"database"},"time":chrono::Utc::now().timestamp()
    }])));
    let snapshot = f.scan(&mut s);
    let volume = snapshot["assets"]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["id"] == "database")
        .unwrap();
    assert!(volume["lastUsed"].is_string());
    assert!(volume["lastUsedSource"]
        .as_str()
        .unwrap()
        .contains("Docker event"));
    f.responses.lock().unwrap().remove("EVENTS");
    let snapshot = f.scan(&mut s);
    let volume = snapshot["assets"]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["id"] == "database")
        .unwrap();
    assert!(volume["lastUsedSource"]
        .as_str()
        .unwrap()
        .contains("Previously observed"));
}

#[test]
fn persistence_failure_does_not_hide_completed_deletions() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    let db = rusqlite::Connection::open(f.temp.path().join("history.sqlite")).unwrap();
    db.execute_batch("CREATE TRIGGER refuse_results BEFORE INSERT ON results BEGIN SELECT RAISE(FAIL,'simulated persistence failure'); END;").unwrap();
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()],
            },
            |_| {},
        )
        .unwrap();
    let events = Mutex::new(vec![]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |e| events.lock().unwrap().push(e),
        )
        .unwrap();
    assert_progress_matches(&events.into_inner().unwrap(), &result);
    assert_eq!(result["outcomes"][0]["status"], "deleted");
    assert!(result["notes"]
        .as_array()
        .unwrap()
        .iter()
        .any(|n| n.as_str().unwrap().contains("could not be persisted")));
}

#[test]
fn cancellation_received_while_desktop_worker_queues_is_not_erased() {
    let f = Fixture::new();
    let mut s = f.service();
    f.scan(&mut s);
    s.cancelled.store(true, Ordering::Relaxed);
    assert!(s
        .dispatch_prepared(
            Request::Plan {
                keys: vec!["container:old".into()]
            },
            |_| {}
        )
        .is_err());
    // A genuinely new operation can still be started after cancellation.
    assert!(s
        .dispatch(
            Request::Plan {
                keys: vec!["container:old".into()]
            },
            |_| {}
        )
        .is_ok());
    assert!(f
        .calls
        .lock()
        .unwrap()
        .iter()
        .all(|s| s.starts_with("GET ")));
}

#[test]
fn dependent_image_is_skipped_after_container_failure() {
    let f = Fixture::new();
    f.responses
        .lock()
        .unwrap()
        .get_mut("/v1.56/containers/json?all=true&size=true")
        .unwrap()
        .1[1]["State"] = json!("exited");
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/old?force=false&v=false".into(),
        (403, json!({"message":"denied"})),
    );
    f.responses.lock().unwrap().insert(
        "/v1.56/containers/running?force=false&v=false".into(),
        (204, Value::Null),
    );
    let mut s = f.service();
    f.scan(&mut s);
    let plan = s
        .dispatch(
            Request::Plan {
                keys: vec![
                    "container:old".into(),
                    "container:running".into(),
                    "image:sha256:img".into(),
                ],
            },
            |_| {},
        )
        .unwrap();
    let events = Mutex::new(vec![]);
    let result = s
        .dispatch(
            Request::Execute {
                plan_id: plan["id"].as_str().unwrap().into(),
                confirmed: true,
                confirm_volumes: false,
                confirm_cache_scope: false,
            },
            |e| events.lock().unwrap().push(e),
        )
        .unwrap();
    assert_eq!(result["outcomes"][0]["status"], "failed");
    assert_eq!(result["outcomes"][1]["status"], "deleted");
    assert_progress_matches(&events.into_inner().unwrap(), &result);
    assert_eq!(result["outcomes"][2]["status"], "skipped");
    assert!(!f
        .calls
        .lock()
        .unwrap()
        .iter()
        .any(|s| s.starts_with("DELETE /v1.56/images/")));
}
