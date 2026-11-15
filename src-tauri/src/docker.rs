use serde_json::{json, Value};
use std::io::{Read, Write};
use std::os::unix::net::UnixStream;
use std::time::Duration;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Clone)]
pub struct Docker {
    pub endpoint: String,
    pub version: String,
    pub identity: String,
    pub info: Value,
}

pub fn segment(value: &str) -> Result<&str> {
    if value.is_empty()
        || !value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"_.:-".contains(&c))
    {
        return Err("Invalid Docker object identifier".into());
    }
    Ok(value)
}

pub fn encode(value: &str) -> String {
    value
        .bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
}

impl Docker {
    pub fn connect(endpoint: &str) -> Result<Self> {
        let path = endpoint.strip_prefix("unix://")
            .ok_or("Only local unix:///absolute/path endpoints are supported; remote Docker is out of scope")?;
        if !path.starts_with('/') || path.contains(['\n', '\r', '\0']) {
            return Err("Expected an absolute Unix socket path".into());
        }
        let mut docker = Self {
            endpoint: endpoint.into(),
            version: String::new(),
            identity: String::new(),
            info: Value::Null,
        };
        let version = docker.raw("GET", "/version", None)?;
        if version["Os"] != "linux" {
            return Err("Only Linux Docker engines are supported".into());
        }
        let number = |s: &str| -> Result<u32> {
            s.strip_prefix("1.")
                .ok_or("Unsupported Docker API version")?
                .parse()
                .map_err(|_| "Invalid Docker API version".into())
        };
        let api = number(
            version["ApiVersion"]
                .as_str()
                .ok_or("Not a Docker Engine endpoint")?,
        )?
        .min(56);
        let minimum = number(version["MinAPIVersion"].as_str().unwrap_or("1.24"))?;
        if api < 44 || minimum > api {
            return Err("Docker API 1.44–1.56 compatibility is required".into());
        }
        docker.version = format!("v1.{api}");
        docker.info = docker.get("/info")?;
        docker.identity = docker.info["ID"]
            .as_str()
            .ok_or("Docker identity unavailable")?
            .to_string();
        Ok(docker)
    }

    pub fn raw(&self, method: &str, path: &str, body: Option<&Value>) -> Result<Value> {
        if !matches!(method, "GET" | "POST" | "DELETE") || path.contains(['\r', '\n']) {
            return Err("Invalid API request".into());
        }
        let mut stream = UnixStream::connect(self.endpoint.trim_start_matches("unix://"))
            .map_err(|e| format!("Docker socket: {e}. Check socket path and group membership; do not chmod it world-writable."))?;
        stream
            .set_read_timeout(Some(Duration::from_secs(60)))
            .map_err(|e| e.to_string())?;
        stream
            .set_write_timeout(Some(Duration::from_secs(10)))
            .map_err(|e| e.to_string())?;
        let payload = body.map(|v| v.to_string()).unwrap_or_default();
        write!(stream, "{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{payload}", payload.len())
            .map_err(|e| e.to_string())?;
        let mut response = Vec::new();
        stream
            .take(64 * 1024 * 1024 + 1)
            .read_to_end(&mut response)
            .map_err(|e| e.to_string())?;
        if response.len() > 64 * 1024 * 1024 {
            return Err("Docker response exceeded 64 MiB safety limit".into());
        }
        let split = response
            .windows(4)
            .position(|w| w == b"\r\n\r\n")
            .ok_or("Malformed Docker HTTP response")?;
        let headers = String::from_utf8_lossy(&response[..split]);
        let status: u16 = headers
            .split_whitespace()
            .nth(1)
            .ok_or("Missing HTTP status")?
            .parse()
            .map_err(|_| "Invalid HTTP status")?;
        let bytes = &response[split + 4..];
        let decoded = if headers
            .to_ascii_lowercase()
            .contains("transfer-encoding: chunked")
        {
            chunks(bytes)?
        } else {
            bytes.to_vec()
        };
        if !(200..300).contains(&status) {
            let kind = match status {
                401 | 403 => "permission-denied",
                404 | 501 => "unsupported-or-missing",
                _ => "unavailable",
            };
            return Err(format!(
                "{kind}: Docker HTTP {status}: {}",
                String::from_utf8_lossy(&decoded)
            ));
        }
        if decoded.is_empty() {
            return Ok(json!({}));
        }
        if path.contains("/events?") {
            let events: Result<Vec<Value>> = decoded
                .split(|b| *b == b'\n')
                .filter(|line| !line.is_empty())
                .map(|line| serde_json::from_slice(line).map_err(|e| e.to_string()))
                .collect();
            return Ok(Value::Array(events?));
        }
        serde_json::from_slice(&decoded).map_err(|e| format!("Invalid Docker JSON: {e}"))
    }
    pub fn get(&self, path: &str) -> Result<Value> {
        self.call("GET", path, None)
    }
    pub fn events(&self, path: &str) -> Result<Vec<Value>> {
        Ok(self.get(path)?.as_array().cloned().unwrap_or_default())
    }
    pub fn call(&self, method: &str, path: &str, body: Option<&Value>) -> Result<Value> {
        self.raw(method, &format!("/{}{path}", self.version), body)
    }
}

fn chunks(mut input: &[u8]) -> Result<Vec<u8>> {
    let mut output = Vec::new();
    loop {
        let end = input
            .windows(2)
            .position(|w| w == b"\r\n")
            .ok_or("Invalid chunk header")?;
        let header = std::str::from_utf8(&input[..end]).map_err(|_| "Invalid chunk size")?;
        let size = usize::from_str_radix(header.split(';').next().unwrap_or(""), 16)
            .map_err(|_| "Invalid chunk size")?;
        input = &input[end + 2..];
        if size == 0 {
            return Ok(output);
        }
        if size > input.len().saturating_sub(2) || &input[size..size + 2] != b"\r\n" {
            return Err("Truncated chunk".into());
        }
        output.extend_from_slice(&input[..size]);
        input = &input[size + 2..];
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn chunked_response() {
        assert_eq!(
            chunks(b"3\r\nabc\r\n2;x=y\r\nde\r\n0\r\n\r\n").unwrap(),
            b"abcde"
        );
        assert!(chunks(b"9\r\nshort\r\n").is_err());
    }
    #[test]
    fn constrained_identifiers() {
        assert!(segment("sha256:abc_123-foo").is_ok());
        for s in ["", "../foo", "a?force=1", "x\r\n"] {
            assert!(segment(s).is_err());
        }
    }
    #[test]
    fn reject_remote() {
        assert!(Docker::connect("tcp://localhost:2375").is_err());
    }
}
