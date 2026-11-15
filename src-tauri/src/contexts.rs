//! Optional Docker CLI bridge. Never use the CLI's implicit current endpoint.
use crate::docker::Result;
use serde::Serialize;
use serde_json::Value;
use std::{
    io::{Read, Write},
    os::unix::process::CommandExt,
    path::PathBuf,
    process::{Command, Stdio},
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};
use url::Url;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Target {
    pub name: String,
    pub host: String,
    pub tls_dir: Option<PathBuf>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    name: String,
    endpoint: String,
    target: String,
}

pub fn context_name(endpoint: &str) -> Result<&str> {
    let name = endpoint
        .strip_prefix("context://")
        .ok_or("Expected context://NAME")?;
    if name.is_empty()
        || name.len() > 128
        || name.starts_with('-')
        || !name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
    {
        return Err("Invalid Docker context name".into());
    }
    Ok(name)
}

impl Target {
    fn parse(name: &str, v: &Value) -> Result<Self> {
        let host = v["endpoint"]["Host"]
            .as_str()
            .ok_or("Context has no Docker endpoint")?;
        let u = Url::parse(host).map_err(|_| "Invalid context host")?;
        if u.host_str().is_none()
            || u.password().is_some()
            || u.query().is_some()
            || u.fragment().is_some()
            || host.len() > 1024
            || host.chars().any(|c| c.is_control() || c.is_whitespace())
            || host.contains('%')
            || u.host_str().is_some_and(|h| {
                h.starts_with('-')
                    || !h
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b"-.:[]".contains(&b))
            })
            || u.username().starts_with('-')
            || !u
                .username()
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
        {
            return Err("Context host contains unsupported credentials or URL syntax".into());
        }
        let tls_dir = match u.scheme() {
            "ssh" if u.path().is_empty() || u.path() == "/" => None,
            "tcp"
                if u.username().is_empty()
                    && (u.path().is_empty() || u.path() == "/")
                    && v["endpoint"]["SkipTLSVerify"] == false =>
            {
                let material = v["tls"]
                    .as_array()
                    .ok_or("Verified mutual-TLS context material required")?;
                if !["ca.pem", "cert.pem", "key.pem"]
                    .iter()
                    .all(|n| material.iter().any(|m| m.as_str() == Some(n)))
                {
                    return Err(
                        "Verified mutual-TLS context requires CA, client certificate and key"
                            .into(),
                    );
                }
                let dir = PathBuf::from(v["storage"].as_str().unwrap_or(""));
                if !dir.is_absolute()
                    || dir
                        .components()
                        .any(|c| c == std::path::Component::ParentDir)
                {
                    return Err("Invalid Docker context TLS storage location".into());
                }
                Some(dir.join("docker"))
            }
            _ => return Err(
                "Only SSH and verified mutual-TLS TCP contexts are supported; no insecure fallback"
                    .into(),
            ),
        };
        Ok(Self {
            name: name.into(),
            host: host.into(),
            tls_dir,
        })
    }

    pub fn resolve(endpoint: &str) -> Result<Self> {
        let name = context_name(endpoint)?;
        // Deliberately omit arbitrary metadata/descriptions and all key contents.
        let template = r#"{"endpoint":{{json .Endpoints.docker}},"tls":{{json .TLSMaterial.docker}},"storage":{{json .Storage.TLSPath}}}"#;
        let output = cli(
            &["context", "inspect", name, "--format", template],
            None,
            256 * 1024,
            Duration::from_secs(10),
        )?;
        let value =
            serde_json::from_slice(&output).map_err(|_| "Invalid Docker context metadata")?;
        Self::parse(name, &value)
    }

    pub fn exchange(&self, request: Vec<u8>) -> Result<Vec<u8>> {
        if Self::resolve(&format!("context://{}", self.name))? != *self {
            return Err("Docker context changed; reconnect and review a new inventory".into());
        }
        let mut args = vec!["--host".to_string(), self.host.clone()];
        if let Some(dir) = &self.tls_dir {
            args.push("--tlsverify".into());
            for (flag, file) in [
                ("--tlscacert", "ca.pem"),
                ("--tlscert", "cert.pem"),
                ("--tlskey", "key.pem"),
            ] {
                args.push(flag.into());
                args.push(
                    dir.join(file)
                        .to_str()
                        .ok_or("Invalid TLS file path")?
                        .into(),
                );
            }
        }
        args.extend(["system".into(), "dial-stdio".into()]);
        cli(
            &args.iter().map(String::as_str).collect::<Vec<_>>(),
            Some(request),
            64 * 1024 * 1024,
            Duration::from_secs(60),
        )
    }
}

pub fn list() -> Result<Vec<Entry>> {
    let output = cli(
        &["context", "ls", "--format", "{{.Name}}"],
        None,
        32 * 1024,
        Duration::from_secs(10),
    )?;
    let names = std::str::from_utf8(&output).map_err(|_| "Invalid Docker context listing")?;
    let mut result = Vec::new();
    let deadline = Instant::now() + Duration::from_secs(20);
    for name in names.lines().take(32) {
        if Instant::now() >= deadline {
            return Err("Context discovery timed out; enter context://NAME directly".into());
        }
        let endpoint = format!("context://{name}");
        if let Ok(target) = Target::resolve(&endpoint) {
            result.push(Entry {
                name: name.into(),
                endpoint,
                target: target.host,
            });
        }
    }
    Ok(result)
}

// All CLI errors are deliberately generic: stderr may include credentials or
// private configuration. The operator can diagnose with their own CLI.
fn cli(args: &[&str], input: Option<Vec<u8>>, limit: u64, timeout: Duration) -> Result<Vec<u8>> {
    run_command(Command::new("docker"), args, input, limit, timeout)
}

fn run_command(
    mut command: Command,
    args: &[&str],
    input: Option<Vec<u8>>,
    limit: u64,
    timeout: Duration,
) -> Result<Vec<u8>> {
    command
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .process_group(0);
    for name in [
        "DOCKER_HOST",
        "DOCKER_CONTEXT",
        "DOCKER_TLS_VERIFY",
        "DOCKER_TLS",
        "DOCKER_CERT_PATH",
        "DOCKER_API_VERSION",
    ] {
        command.env_remove(name);
    }
    command
        .env("SSH_ASKPASS", "/bin/false")
        .env("SSH_ASKPASS_REQUIRE", "never");
    let mut child = command
        .spawn()
        .map_err(|_| "Docker CLI unavailable; install Docker CLI for context connections")?;
    let id = child.id();
    let mut stdout = child.stdout.take().ok_or("Docker CLI output unavailable")?;
    let mut stdin = child.stdin.take().ok_or("Docker CLI input unavailable")?;
    let (send, recv) = mpsc::channel();
    thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = stdout
            .by_ref()
            .take(limit + 1)
            .read_to_end(&mut bytes)
            .map(|_| bytes);
        let _ = send.send(result);
    });
    thread::spawn(move || {
        if let Some(bytes) = input {
            let _ = stdin.write_all(&bytes);
        }
    });
    let deadline = Instant::now() + timeout;
    let output = recv.recv_timeout(timeout);
    let mut status = None;
    if matches!(&output, Ok(Ok(bytes)) if bytes.len() as u64 <= limit) {
        while Instant::now() < deadline {
            match child.try_wait() {
                Ok(Some(s)) => {
                    status = Some(s);
                    break;
                }
                Ok(None) => thread::sleep(Duration::from_millis(10)),
                Err(_) => break,
            }
        }
    }
    // SAFETY: negative child PID targets only this invocation's new process
    // group, including SSH children, never the application's own process group.
    unsafe {
        libc::kill(-(id as i32), libc::SIGKILL);
    }
    let _ = child.wait();
    match output {
        Ok(Ok(bytes)) if bytes.len() as u64 > limit => Err("Docker CLI response exceeded safety limit".into()),
        Ok(Ok(bytes)) if status.is_some_and(|s| s.success()) => Ok(bytes),
        Err(_) => Err("Docker CLI timed out; verify context connectivity and non-interactive authentication".into()),
        _ if Instant::now() >= deadline => Err("Docker CLI timed out; verify context connectivity and non-interactive authentication".into()),
        _ => Err("Docker context connection failed; verify authentication, host trust and TLS with Docker CLI".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn policy_rejects_insecure_or_credential_bearing_contexts() {
        for name in ["", "-x", "a/b", "a;id", "a\nb"] {
            assert!(context_name(&format!("context://{name}")).is_err());
        }
        for host in [
            "tcp://server:2375",
            "http://server",
            "ssh://u:secret@server",
            "ssh://server?q=secret",
            "ssh://server#x",
            "ssh://server/a",
            "unix:///run/docker.sock",
        ] {
            assert!(Target::parse("test", &json!({"endpoint":{"Host":host}})).is_err());
        }
        assert!(
            Target::parse("test", &json!({"endpoint":{"Host":"ssh://user@server:22"}})).is_ok()
        );
        let mut tls = json!({"endpoint":{"Host":"tcp://server:2376","SkipTLSVerify":false},"tls":["ca.pem","cert.pem","key.pem"],"storage":"/private/contexts/tls/id"});
        assert!(Target::parse("tls", &tls).is_ok());
        tls["endpoint"]["SkipTLSVerify"] = json!(true);
        assert!(Target::parse("tls", &tls).is_err());
    }
    #[test]
    fn bounded_cli_never_exposes_stderr() {
        let error = run_command(
            Command::new("sh"),
            &["-c", "echo SECRET >&2; exit 1"],
            None,
            1024,
            Duration::from_secs(1),
        )
        .unwrap_err();
        assert!(!error.contains("SECRET"));
        assert!(run_command(
            Command::new("sh"),
            &["-c", "printf 12345"],
            None,
            4,
            Duration::from_secs(1)
        )
        .unwrap_err()
        .contains("limit"));
        let start = Instant::now();
        assert!(run_command(
            Command::new("sh"),
            &["-c", "sleep 30"],
            None,
            1024,
            Duration::from_millis(100)
        )
        .unwrap_err()
        .contains("timed out"));
        assert!(start.elapsed() < Duration::from_secs(3));
    }
}
