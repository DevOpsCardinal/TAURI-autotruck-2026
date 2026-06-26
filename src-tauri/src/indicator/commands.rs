use super::tcp::{tcp_connection_loop, IndicatorState, IndicatorStatusPayload};
use tauri::{AppHandle, Emitter, State};
use tokio::net::TcpStream;
use tokio::time::{self, Duration};

fn validate_index(index: u8) -> Result<(), String> {
    if index == 1 || index == 2 {
        Ok(())
    } else {
        Err("El índice del indicador debe ser 1 o 2.".to_string())
    }
}

fn validate_host(host: &str) -> Result<(), String> {
    let trimmed = host.trim();
    if trimmed.is_empty() {
        return Err("El host no puede estar vacío.".to_string());
    }
    if trimmed.len() > 253 {
        return Err("El host excede la longitud máxima permitida.".to_string());
    }
    Ok(())
}

fn validate_port(port: u16) -> Result<(), String> {
    if port >= 1 {
        Ok(())
    } else {
        Err("El puerto debe estar entre 1 y 65535.".to_string())
    }
}

fn validate_timeout(timeout_ms: u64) -> Result<(), String> {
    if timeout_ms >= 500 && timeout_ms <= 30000 {
        Ok(())
    } else {
        Err("El timeout debe estar entre 500 y 30000 ms.".to_string())
    }
}

#[tauri::command]
pub async fn indicator_connect(
    app: AppHandle,
    state: State<'_, IndicatorState>,
    index: u8,
    host: String,
    port: u16,
    timeout_ms: u64,
) -> Result<(), String> {
    validate_index(index)?;
    validate_host(&host)?;
    validate_port(port)?;
    validate_timeout(timeout_ms)?;

    let handle_mutex = match index {
        1 => &state.indicator1,
        2 => &state.indicator2,
        _ => return Err("Índice de indicador inválido.".to_string()),
    };

    let mut handle = handle_mutex.lock().await;

    if let Some(tx) = handle.shutdown_tx.take() {
        let _ = tx.send(());
    }

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
    handle.shutdown_tx = Some(shutdown_tx);
    handle.reconnect_enabled = true;

    let trimmed_host = host.trim().to_string();

    let _ = app.emit(
        &format!("indicator-{}-status", index),
        IndicatorStatusPayload {
            status: "connecting".to_string(),
            host: Some(trimmed_host.clone()),
            port: Some(port),
            message: None,
        },
    );

    let app_clone = app.clone();
    tokio::spawn(async move {
        tcp_connection_loop(
            app_clone,
            index,
            trimmed_host,
            port,
            timeout_ms,
            shutdown_rx,
        )
        .await;
    });

    Ok(())
}

#[tauri::command]
pub async fn indicator_disconnect(
    app: AppHandle,
    state: State<'_, IndicatorState>,
    index: u8,
) -> Result<(), String> {
    validate_index(index)?;

    let handle_mutex = match index {
        1 => &state.indicator1,
        2 => &state.indicator2,
        _ => return Err("Índice de indicador inválido.".to_string()),
    };

    let mut handle = handle_mutex.lock().await;

    if let Some(tx) = handle.shutdown_tx.take() {
        let _ = tx.send(());
    }
    handle.reconnect_enabled = false;

    let _ = app.emit(
        &format!("indicator-{}-status", index),
        IndicatorStatusPayload {
            status: "disconnected".to_string(),
            host: None,
            port: None,
            message: Some("Desconectado manualmente".to_string()),
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn indicator_test_connection(
    host: String,
    port: u16,
    timeout_ms: u64,
) -> Result<String, String> {
    validate_host(&host)?;
    validate_port(port)?;
    validate_timeout(timeout_ms)?;

    let trimmed_host = host.trim().to_string();
    let addr = format!("{}:{}", trimmed_host, port);

    match time::timeout(
        Duration::from_millis(timeout_ms),
        TcpStream::connect(&addr),
    )
    .await
    {
        Ok(Ok(_stream)) => Ok(format!("Conexión exitosa con {}:{}", trimmed_host, port)),
        Ok(Err(e)) => Err(format!("Error de conexión: {}", e)),
        Err(_) => Err(format!("Tiempo de espera agotado ({}ms)", timeout_ms)),
    }
}
