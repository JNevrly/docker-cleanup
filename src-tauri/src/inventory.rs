use crate::{
    docker::{segment, Docker, Result},
    model::*,
    store::Store,
};
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

fn labels(v: &Value) -> BTreeMap<String, String> {
    v.as_object()
        .map(|m| {
            m.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.into())))
                .collect()
        })
        .unwrap_or_default()
}
fn name(v: &Value, fallback: &str) -> String {
    v.as_str()
        .unwrap_or(fallback)
        .trim_start_matches('/')
        .into()
}

pub fn attribute(asset: &mut Asset) {
    let mut candidates = BTreeSet::new();
    for (key, confidence) in [
        ("com.docker.compose.project", "explicit Compose label"),
        (
            "devcontainer.local_folder",
            "explicit devcontainer workspace",
        ),
        ("vsch.local.folder", "explicit VS Code workspace"),
    ] {
        if let Some(value) = asset.labels.get(key) {
            candidates.insert(value.clone());
            asset.evidence.push(format!("{confidence}: {value}"));
            if asset.project == "Unattributed" {
                asset.project = value.clone();
            }
        }
    }
    if candidates.len() > 1 {
        asset.evidence.push("Multiple metadata identities; Compose group takes precedence, workspace retained as evidence".into());
    }
    for key in [
        "com.docker.compose.service",
        "com.docker.compose.project.working_dir",
        "com.docker.compose.project.config_files",
        "devcontainer.config_file",
        "vsch.local.repository",
    ] {
        if let Some(value) = asset.labels.get(key) {
            asset.evidence.push(format!("{key}: {value}"));
        }
    }
    for mount in &asset.mounts {
        if mount.kind == "bind" {
            asset.evidence.push(format!(
                "External workspace clue (inferred): {} → {}",
                mount.source, mount.destination
            ));
            if asset.project == "Unattributed"
                && (mount.destination.starts_with("/workspaces")
                    || mount.destination == "/workspace")
            {
                asset.project = mount.source.clone();
            }
        }
    }
}

pub fn scan(docker: &Docker, store: &Store, cancelled: impl Fn() -> bool) -> Result<Snapshot> {
    let mut warnings = vec![
        "Last use is not universally reported. Container finish time is not volume last use; missing process activity is not proof of non-use.".into(),
        "History covers observations only; activity while disconnected or between scans can be missed.".into(),
    ];
    let mut capabilities = BTreeMap::new();
    capabilities.insert("api".into(), docker.version.clone());
    capabilities.insert(
        "builder".into(),
        "Engine-managed cache only. External buildx builders are unsupported; no CLI dependency."
            .into(),
    );
    let df = match docker.get("/system/df") {
        Ok(v) => {
            capabilities.insert("storage".into(), "available".into());
            v
        }
        Err(e) => {
            warnings.push(format!("Storage accounting: {e}"));
            capabilities.insert("storage".into(), e);
            json!({})
        }
    };
    capabilities.insert(
        "cache".into(),
        if capabilities.get("storage").map(String::as_str) != Some("available") {
            "unavailable"
        } else if df["BuildCache"].is_array() || df.get("BuildCache") == Some(&Value::Null) {
            "available"
        } else {
            "unsupported"
        }
        .into(),
    );
    let list = docker.get("/containers/json?all=true&size=true")?;
    let mut assets = vec![];
    for c in array(&list) {
        if cancelled() {
            return Err("Scan cancelled; previous inventory retained".into());
        }
        let id = c["Id"].as_str().ok_or("Container has no ID")?;
        let mut a = Asset::new("container", id, &name(&c["Names"][0], id));
        a.bytes = size(&c["SizeRw"]);
        a.state = name(&c["State"], "unknown");
        a.created = timestamp(&c["Created"]);
        a.labels = labels(&c["Labels"]);
        a.ports = array(&c["Ports"])
            .iter()
            .filter_map(|p| p["PublicPort"].as_u64().and_then(|p| p.try_into().ok()))
            .collect();
        match docker.get(&format!("/containers/{}/json?size=true", segment(id)?)) {
            Ok(inspect) => {
                a.started = timestamp(&inspect["State"]["StartedAt"]);
                a.finished = timestamp(&inspect["State"]["FinishedAt"]);
                a.bytes = size(&inspect["SizeRw"]).or(a.bytes);
                let image = inspect["Image"].as_str().unwrap_or("");
                a.refs.push(format!("image:{image}"));
                a.evidence.push(format!("Image: {}; entrypoint/command programs: {} / {}; working directory: {} (arguments/environment omitted)",
                    inspect["Config"]["Image"].as_str().unwrap_or("unknown"),
                    inspect["Config"]["Entrypoint"][0].as_str().unwrap_or("unknown"), inspect["Config"]["Cmd"][0].as_str().unwrap_or("unknown"),
                    inspect["Config"]["WorkingDir"].as_str().unwrap_or("")));
                for m in array(&inspect["Mounts"]) {
                    let mount = Mount {
                        kind: name(&m["Type"], "unknown"),
                        source: name(&m["Source"], ""),
                        destination: m["Destination"].as_str().unwrap_or("").into(),
                        name: name(&m["Name"], ""),
                    };
                    // Preserve leading slash on host paths.
                    let mut mount = mount;
                    mount.source = m["Source"].as_str().unwrap_or("").into();
                    if mount.kind == "volume" {
                        a.refs.push(format!("volume:{}", mount.name));
                    }
                    a.mounts.push(mount);
                }
            }
            Err(e) => {
                // Unknown references must block destructive plans, not become "unused".
                a.state = "inspection-unavailable".into();
                warnings.push(format!(
                    "Container {} could not be inspected; cleanup blocked: {e}",
                    a.name
                ));
            }
        }
        a.last_used = a.started.clone();
        a.last_used_source =
            "Docker-reported container last start (not a universal last-use time)".into();
        attribute(&mut a);
        assets.push(a);
    }
    let images = if df["Images"].is_array() {
        df["Images"].clone()
    } else {
        match docker.get("/images/json?all=true&shared-size=true") {
            Ok(v) => v,
            Err(e) => {
                warnings.push(e);
                json!([])
            }
        }
    };
    for i in array(&images) {
        let id = i["Id"].as_str().ok_or("Image has no ID")?;
        let tags = array(&i["RepoTags"])
            .iter()
            .filter_map(|v| v.as_str())
            .filter(|s| *s != "<none>:<none>")
            .map(str::to_string)
            .collect::<Vec<_>>();
        let mut a = Asset::new(
            "image",
            id,
            &if tags.is_empty() {
                format!("<dangling> {}", &id[..id.len().min(19)])
            } else {
                tags.join(", ")
            },
        );
        a.state = if tags.is_empty() {
            "dangling"
        } else {
            "tagged"
        }
        .into();
        a.bytes = size(&i["Size"]);
        a.shared = size(&i["SharedSize"]);
        a.created = timestamp(&i["Created"]);
        a.labels = labels(&i["Labels"]);
        a.refs = assets
            .iter()
            .filter(|c| c.kind == "container" && c.refs.contains(&a.key))
            .map(|c| c.key.clone())
            .collect();
        a.last_used = assets
            .iter()
            .filter(|c| a.refs.contains(&c.key))
            .filter_map(|c| c.started.clone())
            .max();
        if a.last_used.is_some() {
            a.last_used_source = "Inferred from existing containers' reported start times; removed containers unknown".into();
        }
        attribute(&mut a);
        assets.push(a);
    }
    let volumes = docker.get("/volumes").map(|v| v["Volumes"].clone());
    match volumes {
        Ok(v) => {
            for volume in array(&v) {
                let id = volume["Name"].as_str().ok_or("Volume has no name")?;
                let mut a = Asset::new("volume", id, id);
                let usage = array(&df["Volumes"]).into_iter().find(|v| v["Name"] == id);
                a.bytes = usage.as_ref().and_then(|v| size(&v["UsageData"]["Size"]));
                a.state = "persistent data".into();
                a.created = timestamp(&volume["CreatedAt"]);
                a.labels = labels(&volume["Labels"]);
                a.refs = assets
                    .iter()
                    .filter(|c| c.kind == "container" && c.refs.contains(&a.key))
                    .map(|c| c.key.clone())
                    .collect();
                attribute(&mut a);
                assets.push(a);
            }
        }
        Err(e) => warnings.push(format!("Volume inventory: {e}")),
    }
    for cache in array(&df["BuildCache"]) {
        let id = cache["ID"]
            .as_str()
            .or(cache["Id"].as_str())
            .ok_or("Cache record has no ID")?;
        let mut a = Asset::new("cache", id, cache["Description"].as_str().unwrap_or(id));
        a.bytes = size(&cache["Size"]);
        a.shared = cache["Shared"]
            .as_bool()
            .map(|s| if s { a.bytes.unwrap_or(0) } else { 0 });
        a.state = if cache["InUse"] == true {
            "in use"
        } else {
            "cache"
        }
        .into();
        a.created = timestamp(&cache["CreatedAt"]);
        a.last_used = timestamp(&cache["LastUsedAt"]);
        if a.last_used.is_some() {
            a.last_used_source = "Docker Engine builder-reported last use".into();
        }
        if let Some(parents) = cache["Parents"].as_array() {
            a.refs = parents
                .iter()
                .filter_map(|v| v.as_str().map(|s| format!("cache:{s}")))
                .collect();
        }
        assets.push(a);
    }
    let image_unique: u64 = assets
        .iter()
        .filter(|a| a.kind == "image")
        .filter_map(|a| a.bytes.zip(a.shared).map(|(b, s)| b.saturating_sub(s)))
        .sum();
    if let Some(total) = size(&df["LayersSize"]).or(size(&df["ImageUsage"]["TotalSize"])) {
        let mut shared = Asset::new("shared", "image-layers", "Shared image layers & metadata");
        shared.bytes = Some(total.saturating_sub(image_unique));
        shared.state = "accounting only".into();
        shared.project = "Shared assets".into();
        shared.evidence.push("Docker-reported total image storage minus attributed unique image sizes. Not independently deletable.".into());
        assets.push(shared);
    } else {
        warnings.push("Deduplicated total image storage unavailable. Images with unknown shared size are excluded from measured treemap area, not counted as zero.".into());
    }
    // Transfer project ownership only when all references agree.
    let projects: BTreeMap<String, String> = assets
        .iter()
        .filter(|a| a.kind == "container")
        .map(|a| (a.key.clone(), a.project.clone()))
        .collect();
    for a in &mut assets {
        if a.kind != "container" {
            let owners: BTreeSet<_> = a
                .refs
                .iter()
                .filter_map(|k| projects.get(k))
                .cloned()
                .collect();
            if owners.len() > 1 {
                a.project = "Shared assets".into();
                a.evidence
                    .push(format!("Shared by {} project groups", owners.len()));
            } else if a.project == "Unattributed" && owners.len() == 1 {
                a.project = owners.into_iter().next().unwrap();
                a.evidence
                    .push("Inferred from referencing containers".into());
            }
        }
        store.apply(&docker.identity, a)?;
        if a.last_used.is_none() {
            if let Some((at, source)) = store.last_observed(&docker.identity, &a.key) {
                a.last_used = Some(at);
                a.last_used_source = source;
            }
        }
    }
    if let Some(previous) = store.last_snapshot(&docker.identity) {
        // Bounded event read, never an indefinite event stream.
        let since = chrono::DateTime::parse_from_rfc3339(&previous.captured_at)
            .map(|t| t.timestamp())
            .unwrap_or(Utc::now().timestamp());
        let path = format!("/events?since={since}&until={}", Utc::now().timestamp());
        // Events are NDJSON rather than a JSON document. Connection uses a dedicated
        // stream decoder in the event method; errors are explicitly non-fatal.
        match docker.events(&path) {
            Ok(events) => {
                for event in &events {
                    let action = event["Action"].as_str().unwrap_or("");
                    let id = event["Actor"]["ID"].as_str().unwrap_or("");
                    let kind = event["Type"].as_str().unwrap_or("");
                    if matches!(
                        (kind, action),
                        ("container", "start") | ("container", "attach") | ("volume", "mount")
                    ) {
                        if let Some(asset) =
                            assets.iter_mut().find(|a| a.id == id && a.kind == kind)
                        {
                            asset.last_used = timestamp(&event["time"]);
                            asset.last_used_source = format!("Docker event observed by application: {kind} {action}; not universal last use");
                        }
                    }
                }
                capabilities.insert("events".into(),format!("{} events observed since previous snapshot; disconnected activity may be incomplete",events.len()))
            }
            Err(e) => {
                warnings.push(format!("Event history unavailable: {e}"));
                None
            }
        };
    } else {
        capabilities.insert(
            "events".into(),
            "No earlier snapshot; historical activity before installation is unknown".into(),
        );
    }
    let snapshot = Snapshot {
        id: Uuid::new_v4().to_string(),
        endpoint: docker.endpoint.clone(),
        daemon_id: docker.identity.clone(),
        captured_at: Utc::now().to_rfc3339(),
        assets,
        warnings,
        capabilities,
    };
    store.snapshot(&snapshot)?;
    Ok(snapshot)
}

pub fn diff(docker: &Docker, asset: &Asset) -> Result<Value> {
    if asset.kind != "container" {
        return Err("Filesystem changes are available only for containers".into());
    }
    let mut changes = docker.get(&format!("/containers/{}/changes", segment(&asset.id)?))?;
    if let Some(changes) = changes.as_array_mut() {
        for change in changes {
            change["status"] = json!(match change["Kind"].as_u64() {
                Some(0) => "changed",
                Some(1) => "added",
                Some(2) => "deleted",
                _ => "unknown",
            });
        }
    }
    Ok(
        json!({"changes":changes,"note":"Paths are added/changed/deleted, not per-path byte measurements. Writable-layer data is lost on removal. Mounted data has a separate lifecycle.","mounts":asset.mounts}),
    )
}

pub fn inspect(docker: &Docker, asset: &Asset) -> Result<Value> {
    let path = match asset.kind.as_str() {
        "container" => format!("/containers/{}/json", segment(&asset.id)?),
        "image" => format!("/images/{}/json", segment(&asset.id)?),
        "volume" => format!("/volumes/{}", segment(&asset.id)?),
        _ => {
            return Ok(
                json!({"asset":asset,"note":"Engine cache metadata only; external builders unsupported"}),
            )
        }
    };
    let mut value = docker.get(&path)?;
    // Do not expose environment secrets by default.
    for field in ["Config", "ContainerConfig"] {
        if let Some(config) = value.get_mut(field).and_then(Value::as_object_mut) {
            config.remove("Env");
        }
    }
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn attribution_is_explainable_and_handles_conflicting_clues() {
        let mut a = Asset::new("container", "c", "random_name");
        a.labels.insert(
            "com.docker.compose.project".into(),
            "compose-project".into(),
        );
        a.labels
            .insert("devcontainer.local_folder".into(), "/work/other".into());
        a.mounts.push(Mount {
            kind: "bind".into(),
            source: "/work/third".into(),
            destination: "/workspaces/third".into(),
            name: String::new(),
        });
        attribute(&mut a);
        assert_eq!(a.project, "compose-project");
        assert!(a
            .evidence
            .iter()
            .any(|e| e.contains("Multiple metadata identities")));
        assert!(a.evidence.iter().any(|e| e.contains("inferred")));
        let mut b = Asset::new("container", "b", "also_random");
        attribute(&mut b);
        assert_eq!(b.project, "Unattributed");
        b.mounts = a.mounts;
        attribute(&mut b);
        assert_eq!(b.project, "/work/third");
    }
}
