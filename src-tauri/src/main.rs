use docker_cleanup::{model::Request, Service};
use serde_json::Value;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{Emitter, Manager};

struct AppState {
    service: Arc<Mutex<Service>>,
    cancelled: Arc<AtomicBool>,
    busy: Arc<AtomicBool>,
}

#[tauri::command]
async fn dispatch(app: tauri::AppHandle, request: Request) -> Result<Value, String> {
    let (busy, service) = {
        let state = app.state::<AppState>();
        state
            .busy
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "Another operation is already running")?;
        state.cancelled.store(false, Ordering::Relaxed);
        (state.busy.clone(), state.service.clone())
    };
    let result = tauri::async_runtime::spawn_blocking(move || {
        let result = service
            .lock()
            .map_err(|_| "Backend state lock failed")?
            .dispatch_prepared(request, |event| {
                let _ = app.emit("operation-progress", event);
            });
        if let Err(error) = &result {
            let _ = app.emit("operation-error", error);
        }
        result
    })
    .await;
    busy.store(false, Ordering::SeqCst);
    result.map_err(|e| e.to_string())?
}

#[tauri::command]
fn cancel(state: tauri::State<AppState>) {
    state.cancelled.store(true, Ordering::Relaxed);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let cancelled = Arc::new(AtomicBool::new(false));
            let service = Service::open(
                &app.path().app_data_dir()?.join("history.sqlite"),
                cancelled.clone(),
            )?;
            app.manage(AppState {
                service: Arc::new(Mutex::new(service)),
                cancelled,
                busy: Arc::new(AtomicBool::new(false)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![dispatch, cancel])
        .run(tauri::generate_context!())
        .expect("Could not start Docker Cleanup");
}
