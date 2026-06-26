use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncReadExt;
use tokio::net::TcpStream;
use tokio::sync::{oneshot, Mutex};
use tokio::time;

const DELIMITER: u8 = 0x0D;
const STX: u8 = 0x02;
const INITIAL_RECONNECT_DELAY_MS: u64 = 3000;
const MAX_RECONNECT_DELAY_MS: u64 = 30000;

#[derive(Serialize, Clone)]
pub struct IndicatorStatusPayload {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub struct IndicatorHandle {
    pub shutdown_tx: Option<oneshot::Sender<()>>,
    pub reconnect_enabled: bool,
}

impl IndicatorHandle {
    pub fn new() -> Self {
        Self {
            shutdown_tx: None,
            reconnect_enabled: true,
        }
    }
}

pub struct IndicatorState {
    pub indicator1: Mutex<IndicatorHandle>,
    pub indicator2: Mutex<IndicatorHandle>,
}

impl Default for IndicatorState {
    fn default() -> Self {
        Self {
            indicator1: Mutex::new(IndicatorHandle::new()),
            indicator2: Mutex::new(IndicatorHandle::new()),
        }
    }
}

fn emit_status(app: &AppHandle, index: u8, payload: IndicatorStatusPayload) {
    let event_name = format!("indicator-{}-status", index);
    if let Err(e) = app.emit(&event_name, payload) {
        eprintln!("[indicator-{}] error emitiendo status: {}", index, e);
    }
}

fn process_buffer(app: &AppHandle, index: u8, buffer: &mut Vec<u8>) {
    while let Some(pos) = buffer.iter().position(|&b| b == DELIMITER) {
        let line = buffer[..pos].to_vec();
        buffer.drain(..=pos);

        if let Some(stx_pos) = line.iter().position(|&b| b == STX) {
            let after = &line[stx_pos + 1..];
            let text = String::from_utf8_lossy(after);
            // Emite el texto crudo de la trama (sin STX ni CR) para que el
            // frontend lo parsee según la trama configurada (Cardinal SMA,
            // Bavaria Tibitoc, etc.).
            let raw = text.trim_end_matches('\r').trim_end();
            if !raw.is_empty() {
                let event_name = format!("scale-weight-{}", index);
                if let Err(e) = app.emit(&event_name, raw.to_string()) {
                    eprintln!("[indicator-{}] error emitiendo trama: {}", index, e);
                }
            }
        }
    }
}

async fn wait_with_shutdown(delay_ms: u64, shutdown_rx: &mut oneshot::Receiver<()>) -> bool {
    tokio::select! {
        _ = &mut *shutdown_rx => true,
        _ = time::sleep(Duration::from_millis(delay_ms)) => false,
    }
}

pub async fn tcp_connection_loop(
    app: AppHandle,
    index: u8,
    host: String,
    port: u16,
    timeout_ms: u64,
    mut shutdown_rx: oneshot::Receiver<()>,
) {
    let addr = format!("{}:{}", host, port);
    let mut reconnect_delay = INITIAL_RECONNECT_DELAY_MS;

    loop {
        eprintln!("[indicator-{}] intentando conectar a {}...", index, addr);

        let connect_result = time::timeout(
            Duration::from_millis(timeout_ms),
            TcpStream::connect(&addr),
        )
        .await;

        match connect_result {
            Ok(Ok(stream)) => {
                eprintln!("[indicator-{}] conectado a {}", index, addr);
                emit_status(
                    &app,
                    index,
                    IndicatorStatusPayload {
                        status: "connected".to_string(),
                        host: Some(host.clone()),
                        port: Some(port),
                        message: None,
                    },
                );
                reconnect_delay = INITIAL_RECONNECT_DELAY_MS;

                let mut stream = stream;
                let mut buffer = Vec::new();
                let mut read_buf = [0u8; 1024];
                let mut disconnected_message: Option<String> = None;
                let mut shutdown_requested = false;

                loop {
                    tokio::select! {
                        result = &mut shutdown_rx => {
                            shutdown_requested = true;
                            let _ = result;
                            break;
                        }
                        result = stream.read(&mut read_buf) => {
                            match result {
                                Ok(0) => {
                                    disconnected_message = Some("Conexión cerrada remotamente".to_string());
                                    eprintln!("[indicator-{}] conexión cerrada remotamente", index);
                                    break;
                                }
                                Ok(n) => {
                                    buffer.extend_from_slice(&read_buf[..n]);
                                    process_buffer(&app, index, &mut buffer);
                                }
                                Err(e) => {
                                    disconnected_message = Some(format!("Error de lectura: {}", e));
                                    eprintln!("[indicator-{}] error de lectura: {}", index, e);
                                    break;
                                }
                            }
                        }
                    }
                }

                if shutdown_requested {
                    eprintln!("[indicator-{}] desconexión solicitada, saliendo", index);
                    return;
                }

                let msg = disconnected_message.unwrap_or_else(|| "Desconectado".to_string());
                emit_status(
                    &app,
                    index,
                    IndicatorStatusPayload {
                        status: "disconnected".to_string(),
                        host: Some(host.clone()),
                        port: Some(port),
                        message: Some(msg),
                    },
                );
            }
            Ok(Err(e)) => {
                let msg = format!("Error de conexión: {}", e);
                eprintln!("[indicator-{}] {}", index, msg);
                emit_status(
                    &app,
                    index,
                    IndicatorStatusPayload {
                        status: "error".to_string(),
                        host: Some(host.clone()),
                        port: Some(port),
                        message: Some(msg),
                    },
                );
            }
            Err(_) => {
                let msg = format!("Tiempo de espera agotado ({}ms)", timeout_ms);
                eprintln!("[indicator-{}] {}", index, msg);
                emit_status(
                    &app,
                    index,
                    IndicatorStatusPayload {
                        status: "error".to_string(),
                        host: Some(host.clone()),
                        port: Some(port),
                        message: Some(msg),
                    },
                );
            }
        }

        eprintln!(
            "[indicator-{}] reintentando en {}ms...",
            index, reconnect_delay
        );
        if wait_with_shutdown(reconnect_delay, &mut shutdown_rx).await {
            eprintln!("[indicator-{}] desconexión solicitada durante espera", index);
            return;
        }

        reconnect_delay = (reconnect_delay * 2).min(MAX_RECONNECT_DELAY_MS);
    }
}
