//! Headless adapter for integration testing the exact desktop domain service.
use docker_cleanup::{model::Request, Service};
use serde_json::json;
use std::{
    io::{self, BufRead, Write},
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};

fn main() {
    let Some(path) = std::env::var_os("DOCKER_CLEANUP_RPC_DATABASE") else {
        eprintln!("DOCKER_CLEANUP_RPC_DATABASE must explicitly name a scratch database");
        std::process::exit(2);
    };
    let mut service =
        Service::open(&PathBuf::from(path), Arc::new(AtomicBool::new(false))).expect("database");
    for line in io::stdin().lock().lines() {
        let result = line
            .map_err(|e| e.to_string())
            .and_then(|s| serde_json::from_str::<Request>(&s).map_err(|e| e.to_string()))
            .and_then(|r| service.dispatch(r, |event| eprintln!("{event}")));
        println!(
            "{}",
            match result {
                Ok(value) => json!({"ok":value}),
                Err(error) => json!({"error":error}),
            }
        );
        io::stdout().flush().unwrap();
    }
}
