mod backup;
mod indicator;
mod server;

use indicator::{
    indicator_connect, indicator_disconnect, indicator_test_connection, IndicatorState,
};
use tauri::Manager;

/// Estado compartido con las rutas de la base de datos para el backup de cierre.
struct BackupPaths {
    db_path: std::path::PathBuf,
    data_dir: std::path::PathBuf,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn print_ticket(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(IndicatorState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            print_ticket,
            indicator_connect,
            indicator_disconnect,
            indicator_test_connection,
        ])
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("no se pudo obtener el directorio de datos");

            let db_path = data_dir.join("bioplanta.db");

            // Backup de arranque: copia la DB al inicio del día si aún no existe.
            backup::on_startup(&db_path, &data_dir);

            // Almacena las rutas para usarlas en el backup de cierre.
            app.manage(BackupPaths {
                db_path: db_path.clone(),
                data_dir: data_dir.clone(),
            });

            tauri::async_runtime::spawn(async move {
                if let Err(e) = server::start_server(data_dir).await {
                    eprintln!("[server] error fatal: {}", e);
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            // Backup de cierre: guarda el estado final del día.
            let bp = app_handle.state::<BackupPaths>();
            backup::on_exit(&bp.db_path, &bp.data_dir);

            // Desconecta los indicadores de báscula.
            let state = app_handle.state::<IndicatorState>();
            tauri::async_runtime::block_on(async {
                for mutex in [&state.indicator1, &state.indicator2] {
                    let mut handle = mutex.lock().await;
                    if let Some(tx) = handle.shutdown_tx.take() {
                        let _ = tx.send(());
                    }
                }
            });
        }
    });
}
