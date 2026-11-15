use crate::{
    docker::{segment, Docker, Result},
    model::Asset,
};
use chrono::Utc;
use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path};

pub fn collect(docker: &Docker, asset: &Asset) -> Result<Value> {
    if asset.kind != "container" {
        return Err("Process evidence is available for containers only".into());
    }
    let mut notes = vec![
        "On-demand observations only. Relationships are clues, not proof of ownership or disposability.".to_string(),
        "Only executable names are requested; command arguments and environment are not collected.".into(),
    ];
    let inside = if asset.state == "running" {
        match docker.get(&format!(
            "/containers/{}/top?ps_args=-eo%20pid%2Ccomm",
            segment(&asset.id)?
        )) {
            Ok(v) => v,
            Err(e) => {
                notes.push(format!("Container processes unavailable: {e}"));
                Value::Null
            }
        }
    } else {
        notes.push(
            "Stopped containers have no running processes; they were not started for inspection."
                .into(),
        );
        Value::Null
    };
    let mut host = vec![];
    if std::env::var("HARNESS_SANDBOX").as_deref() == Ok("1") {
        notes.push("Host correlation unavailable inside this development sandbox: /proc describes the sandbox, not the Docker host.".into());
    } else {
        // Map local TCP clients whose remote port matches a container's published
        // port. Remote address must be loopback to avoid unrelated remote services.
        let mut sockets: BTreeMap<String, u16> = BTreeMap::new();
        for file in ["/proc/net/tcp", "/proc/net/tcp6"] {
            if let Ok(content) = fs::read_to_string(file) {
                for line in content.lines().skip(1) {
                    let fields: Vec<_> = line.split_whitespace().collect();
                    if fields.len() < 10 {
                        continue;
                    }
                    let Some((address, port)) = fields[2].split_once(':') else {
                        continue;
                    };
                    let Ok(port) = u16::from_str_radix(port, 16) else {
                        continue;
                    };
                    if asset.ports.contains(&port)
                        && (address == "0100007F" || address == "00000000000000000000000001000000")
                    {
                        sockets.insert(fields[9].to_string(), port);
                    }
                }
            }
        }
        let mut denied = 0u64;
        if let Ok(entries) = fs::read_dir("/proc") {
            for entry in entries.flatten() {
                let pid = entry.file_name().to_string_lossy().to_string();
                if !pid.bytes().all(|b| b.is_ascii_digit()) {
                    continue;
                }
                let base = entry.path();
                let Ok(comm) = fs::read_to_string(base.join("comm")) else {
                    denied += 1;
                    continue;
                };
                let cwd = fs::read_link(base.join("cwd")).ok();
                let mut evidence = vec![];
                if let Some(cwd) = cwd {
                    for mount in &asset.mounts {
                        if mount.kind == "bind" && cwd.starts_with(Path::new(&mount.source)) {
                            evidence.push(format!(
                                "Matching workspace cwd: {} (inferred)",
                                mount.source
                            ));
                        }
                    }
                }
                if let Ok(fds) = fs::read_dir(base.join("fd")) {
                    for fd in fds.flatten() {
                        if let Ok(target) = fs::read_link(fd.path()) {
                            let value = target.to_string_lossy();
                            if let Some(inode) = value
                                .strip_prefix("socket:[")
                                .and_then(|s| s.strip_suffix(']'))
                            {
                                if let Some(port) = sockets.get(inode) {
                                    evidence.push(format!("Local TCP client connection to published port {port} (inferred, network namespace dependent)"));
                                }
                            }
                        }
                    }
                } else {
                    denied += 1;
                }
                if !evidence.is_empty() {
                    evidence.sort();
                    evidence.dedup();
                    host.push(json!({"pid":pid,"program":comm.trim(),"evidence":evidence}));
                }
            }
        }
        notes.push(format!("Best-effort local /proc evidence; {denied} inaccessible/exited process entries. Rootless/remote namespace mappings may prevent correlation."));
    }
    Ok(json!({"observedAt":Utc::now().to_rfc3339(),"container":inside,"host":host,"notes":notes}))
}
