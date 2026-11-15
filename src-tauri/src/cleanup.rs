use crate::{
    docker::{segment, Docker, Result},
    model::*,
};
use chrono::Utc;
use serde_json::Value;
use std::collections::BTreeSet;
use uuid::Uuid;

pub fn storage_bytes(a: &Asset) -> Option<u64> {
    match a.kind.as_str() {
        "image" => a.bytes.zip(a.shared).map(|(b, s)| b.saturating_sub(s)),
        "cache" => match a.shared {
            Some(0) => a.bytes,
            Some(_) => Some(0),
            None => None,
        },
        _ => a.bytes,
    }
}

pub fn estimate(snapshot: &Snapshot, keys: &BTreeSet<String>) -> Estimate {
    let mut estimate = Estimate { reported: 0, lower: 0, upper: Some(0), notes: vec![
        "Bounds describe Docker-reported logical data, not guaranteed host free-space recovery. Shared layers are not blindly summed.".into()
    ] };
    let mut shared_images = false;
    for a in snapshot.assets.iter().filter(|a| keys.contains(&a.key)) {
        estimate.reported = estimate.reported.saturating_add(a.bytes.unwrap_or(0));
        estimate.upper = estimate
            .upper
            .zip(a.bytes)
            .map(|(x, b)| x.saturating_add(b));
        let eligible = match a.kind.as_str() {
            "image" | "volume" => a.refs.iter().all(|r| keys.contains(r)),
            "container" => matches!(a.state.as_str(), "exited" | "created" | "dead"),
            "cache" => a.state != "in use",
            _ => false,
        };
        if eligible {
            estimate.lower = estimate.lower.saturating_add(storage_bytes(a).unwrap_or(0));
        }
        if a.kind == "image" && a.shared != Some(0) {
            shared_images = true;
        }
        if a.bytes.is_none() || (a.kind == "image" && a.shared.is_none()) {
            estimate.notes.push(format!(
                "{} has unknown size/shared accounting; estimate is incomplete.",
                a.name
            ));
        }
    }
    if shared_images {
        estimate.notes.push("Layers shared only among selected images may also be reclaimed; Engine does not expose enough data to attribute these exactly. Range includes this uncertainty.".into());
    }
    estimate
}

pub fn build_plan(snapshot: &Snapshot, keys: &[String], cache_scope: bool) -> Result<Plan> {
    let keys: BTreeSet<String> = keys.iter().cloned().collect();
    if keys.is_empty() {
        return Err("Select at least one asset".into());
    }
    let mut actions = vec![];
    let mut warnings = vec!["Deletion is irreversible. Container volumes and bind mounts are retained unless a volume is explicitly selected.".into()];
    if snapshot
        .assets
        .iter()
        .any(|a| a.state == "inspection-unavailable")
    {
        return Err(
            "Incomplete container references; refresh successfully before planning any cleanup"
                .into(),
        );
    }
    for key in &keys {
        let a = snapshot
            .assets
            .iter()
            .find(|a| &a.key == key)
            .ok_or_else(|| format!("Stale selection: {key}"))?;
        if a.protected {
            return Err(format!("{} is protected", a.name));
        }
        match a.kind.as_str() {
            "container" if !matches!(a.state.as_str(),"exited" | "created" | "dead") =>
                return Err(format!("{} is not a stopped disposable container; automatic stopping is forbidden",a.name)),
            "image" | "volume" if a.refs.iter().any(|r| !keys.contains(r)) =>
                return Err(format!("{} still has references outside this selection",a.name)),
            "cache" if !cache_scope => return Err("Individual cache deletion is unsupported. Use the explicit Engine builder-cache prune workflow.".into()),
            "container" | "image" | "volume" | "cache" => {},
            _ => return Err("Shared accounting buckets and bind mounts are not deletion targets".into()),
        }
        actions.push(Action {
            key: a.key.clone(),
            id: a.id.clone(),
            kind: a.kind.clone(),
            name: a.name.clone(),
            fingerprint: a.fingerprint(),
            evidence: a.evidence.clone(),
            retained_mounts: a
                .mounts
                .iter()
                .filter(|m| m.kind == "bind" || !keys.contains(&format!("volume:{}", m.name)))
                .cloned()
                .collect(),
        });
    }
    if cache_scope {
        if actions.iter().any(|a| a.kind != "cache") {
            return Err("Builder prune cannot be combined with object deletion".into());
        }
        if snapshot
            .assets
            .iter()
            .any(|a| a.kind == "cache" && (a.protected || !keys.contains(&a.key)))
        {
            return Err("Builder-wide cache prune cannot guarantee exclusion of protected or unreviewed cache records".into());
        }
        warnings.push("Engine-wide builder-cache prune, not per-record deletion. All eligible Engine cache is in scope; in-use records are retained by Docker. External buildx builders are unsupported.".into());
    }
    actions.sort_by_key(|a| match a.kind.as_str() {
        "container" => 0,
        "image" => 1,
        "volume" => 2,
        _ => 3,
    });
    let volumes = actions.iter().any(|a| a.kind == "volume");
    if volumes {
        warnings.push("Selected volumes may contain databases or irreplaceable user data. Unreferenced does not mean unimportant.".into());
    }
    let newly_eligible = snapshot
        .assets
        .iter()
        .filter(|a| {
            a.kind == "image"
                && !keys.contains(&a.key)
                && !a.refs.is_empty()
                && a.refs.iter().all(|r| keys.contains(r))
        })
        .map(|a| a.key.clone())
        .collect();
    Ok(Plan {
        id: Uuid::new_v4().to_string(),
        snapshot_id: snapshot.id.clone(),
        daemon_id: snapshot.daemon_id.clone(),
        created_at: Utc::now().to_rfc3339(),
        actions,
        warnings,
        estimate: estimate(snapshot, &keys),
        newly_eligible,
        volumes,
        cache_scope,
    })
}

pub fn prune_keys(
    snapshot: &Snapshot,
    scope: &str,
    days: Option<u32>,
) -> Result<(Vec<String>, bool)> {
    if !matches!(
        scope,
        "containers" | "dangling" | "images" | "volumes" | "cache"
    ) {
        return Err("Unknown prune scope".into());
    }
    if scope == "cache"
        && snapshot
            .assets
            .iter()
            .any(|a| a.kind == "cache" && a.protected)
    {
        return Err("Protected cache prevents Engine-wide prune".into());
    }
    if scope == "cache" && days.is_some() {
        return Err(
            "Age-filtered cache pruning is unsupported; no broader scope will be substituted"
                .into(),
        );
    }
    let cutoff = days.map(|d| Utc::now() - chrono::Duration::days(d as i64));
    let keys = snapshot
        .assets
        .iter()
        .filter(|a| {
            let eligible = match scope {
                "containers" => {
                    a.kind == "container"
                        && matches!(a.state.as_str(), "exited" | "created" | "dead")
                }
                "dangling" => a.kind == "image" && a.state == "dangling" && a.refs.is_empty(),
                "images" => a.kind == "image" && a.refs.is_empty(),
                "volumes" => a.kind == "volume" && a.refs.is_empty(),
                "cache" => a.kind == "cache",
                _ => false,
            };
            let old_enough = cutoff
                .map(|t| {
                    let at = if a.kind == "container" {
                        a.finished.as_ref().or(a.created.as_ref())
                    } else {
                        a.created.as_ref()
                    };
                    at.and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                        .map(|at| at < t)
                        .unwrap_or(false)
                })
                .unwrap_or(true);
            eligible && !a.protected && old_enough
        })
        .map(|a| a.key.clone())
        .collect();
    Ok((keys, scope == "cache"))
}

pub fn remove(docker: &Docker, action: &Action) -> Result<Value> {
    let id = segment(&action.id)?;
    match action.kind.as_str() {
        // Explicitly retain volumes and reject force for containers and images.
        "container" => docker.call(
            "DELETE",
            &format!("/containers/{id}?force=false&v=false"),
            None,
        ),
        "image" => docker.call(
            "DELETE",
            &format!("/images/{id}?force=false&noprune=true"),
            None,
        ),
        "volume" => docker.call("DELETE", &format!("/volumes/{id}?force=false"), None),
        _ => Err("Unsupported individual deletion".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn snapshot(assets: Vec<Asset>) -> Snapshot {
        Snapshot {
            id: "s".into(),
            endpoint: "unix:///test".into(),
            daemon_id: "d".into(),
            captured_at: Utc::now().to_rfc3339(),
            assets,
            warnings: vec![],
            capabilities: Default::default(),
        }
    }
    #[test]
    fn shared_image_bounds_not_naive_sum() {
        let mut a = Asset::new("image", "a", "a");
        a.bytes = Some(100);
        a.shared = Some(80);
        let mut b = a.clone();
        b.key = "image:b".into();
        b.id = "b".into();
        let s = snapshot(vec![a, b]);
        let e = estimate(&s, &BTreeSet::from(["image:a".into(), "image:b".into()]));
        assert_eq!(e.lower, 40);
        assert_eq!(e.upper, Some(200));
        assert!(e.notes.iter().any(|s| s.contains("only among selected")));
    }
    #[test]
    fn unknown_is_not_zero() {
        let s = snapshot(vec![Asset::new("volume", "v", "v")]);
        assert_eq!(
            estimate(&s, &BTreeSet::from(["volume:v".into()])).upper,
            None
        );
        let mut cache = Asset::new("cache", "unknown-sharing", "cache");
        cache.bytes = Some(100);
        assert_eq!(storage_bytes(&cache), None);
    }
    #[test]
    fn protects_running_referenced_and_shared() {
        let mut c = Asset::new("container", "c", "c");
        c.state = "running".into();
        let mut v = Asset::new("volume", "v", "v");
        v.refs = vec![c.key.clone()];
        let s = snapshot(vec![c.clone(), v]);
        assert!(build_plan(&s, &[c.key], false).is_err());
        assert!(build_plan(&s, &["volume:v".into()], false).is_err());
        let mut a = Asset::new("image", "i", "i");
        a.protected = true;
        assert!(build_plan(&snapshot(vec![a]), &["image:i".into()], false).is_err());
        assert!(build_plan(
            &snapshot(vec![Asset::new("shared", "x", "shared")]),
            &["shared:x".into()],
            false
        )
        .is_err());
    }
    #[test]
    fn order_and_newly_eligible() {
        let mut c = Asset::new("container", "c", "c");
        c.state = "exited".into();
        let mut i = Asset::new("image", "i", "i");
        i.refs = vec![c.key.clone()];
        let s = snapshot(vec![c.clone(), i.clone()]);
        assert_eq!(
            build_plan(&s, &[c.key.clone()], false)
                .unwrap()
                .newly_eligible,
            vec![i.key.clone()]
        );
        let p = build_plan(&s, &[i.key, c.key], false).unwrap();
        assert_eq!(p.actions[0].kind, "container");
    }
    #[test]
    fn cache_requires_full_scope() {
        let c = Asset::new("cache", "c", "c");
        let mut d = Asset::new("cache", "d", "d");
        d.protected = true;
        let s = snapshot(vec![c, d]);
        assert!(build_plan(&s, &["cache:c".into()], false).is_err());
        assert!(prune_keys(&s, "cache", None).is_err());
    }

    #[test]
    fn prune_filters_preserve_protection_references_and_unknown_age() {
        let mut old = Asset::new("volume", "old", "old");
        old.created = Some((Utc::now() - chrono::Duration::days(100)).to_rfc3339());
        let mut keep = old.clone();
        keep.id = "keep".into();
        keep.key = "volume:keep".into();
        keep.protected = true;
        let mut referenced = old.clone();
        referenced.id = "ref".into();
        referenced.key = "volume:ref".into();
        referenced.refs = vec!["container:c".into()];
        let unknown = Asset::new("volume", "unknown", "unknown");
        let s = snapshot(vec![old, keep, referenced, unknown]);
        assert_eq!(
            prune_keys(&s, "volumes", Some(30)).unwrap().0,
            vec!["volume:old"]
        );
        let mut dangling = Asset::new("image", "dangling", "<dangling>");
        dangling.state = "dangling".into();
        let mut tagged = Asset::new("image", "tagged", "tag:latest");
        tagged.state = "tagged".into();
        let s = snapshot(vec![dangling, tagged]);
        assert_eq!(
            prune_keys(&s, "dangling", None).unwrap().0,
            vec!["image:dangling"]
        );
        assert_eq!(prune_keys(&s, "images", None).unwrap().0.len(), 2);
    }
}
