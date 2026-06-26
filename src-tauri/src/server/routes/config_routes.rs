use std::sync::Arc;
use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use rusqlite::params;
use serde_json::{json, Value};
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};

use crate::server::{auth::AuthUser, error::AppError, AppState};

const EDITABLE_PARAMS: &[&str] = &[
    "regla_peso_minimo_activa",
    "regla_peso_salida_minimo_activa",
    "Trama",
    "Empresa",
    "Direccion",
    "Telefono",
    "Campo1",
    "Campo2",
    "empresa_nombre",
    "empresa_nit",
    "empresa_direccion",
    "empresa_ciudad",
    "empresa_telefono",
    "empresa_logo_path",
    "empresa_correo",
    "indicador1_modo",
    "indicador1_ip",
    "indicador1_puerto",
    "indicador1_timeout",
    "indicador1_trama",
    "indicador2_modo",
    "indicador2_ip",
    "indicador2_puerto",
    "indicador2_timeout",
    "indicador2_trama",
];

const READ_ONLY_PARAMS: &[&str] = &["No_Tiquete_Ingresos", "No_Tiquete_Despachos"];

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/configuraciones", get(get_all))
        .route("/configuraciones/:parametro", put(put_config))
        .route("/configuraciones/trama", get(get_trama))
        .route("/configuraciones/tiquete-ingresos", get(get_tiquete_ing))
        .route("/configuraciones/tiquete-ingresos", put(put_tiquete_ing))
        .route("/configuraciones/tiquete-despachos", get(get_tiquete_desp))
        .route("/configuraciones/tiquete-despachos", put(put_tiquete_desp))
        .route("/configuraciones/indicador/test-connection", post(test_connection))
}

async fn get_all(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    user.require_permission("settings:read")?;
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let mut stmt = conn.prepare(
            "SELECT parametro, valor, descripcion FROM configuraciones ORDER BY parametro",
        )?;
        let rows: Vec<Value> = stmt
            .query_map([], |r| {
                Ok(json!({
                    "parametro": r.get::<_, String>(0)?,
                    "valor": r.get::<_, String>(1)?,
                    "descripcion": r.get::<_, Option<String>>(2)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();
        Ok(Json(json!({ "data": rows })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn put_config(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(parametro): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("settings:write")?;

    if READ_ONLY_PARAMS.contains(&parametro.as_str()) {
        return Err(AppError::Forbidden(
            "Este parámetro no puede modificarse desde la pantalla de configuraciones.".into(),
        ));
    }
    if !EDITABLE_PARAMS.contains(&parametro.as_str()) {
        return Err(AppError::Forbidden(
            "Este parámetro no puede modificarse desde la pantalla de configuraciones.".into(),
        ));
    }

    let valor = body
        .get("valor")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            AppError::BadRequest(
                "VALIDATION_ERROR".into(),
                "El campo valor es requerido y debe ser un string.".into(),
            )
        })?
        .to_string();

    let db = state.db.clone();
    let param = parametro.clone();
    let val = valor.clone();
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        conn.execute(
            "INSERT INTO configuraciones (parametro, valor, actualizado_en)
             VALUES (?1,?2,?3)
             ON CONFLICT(parametro) DO UPDATE SET valor=excluded.valor, actualizado_en=excluded.actualizado_en",
            params![param, val, now],
        )?;
        Ok(())
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    Ok(Json(json!({ "parametro": parametro, "valor": valor, "actualizado_en": now })))
}

async fn get_trama(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let valor: String = conn
            .query_row(
                "SELECT valor FROM configuraciones WHERE parametro = 'Trama'",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "Cardinal SMA".into());
        Ok(Json(json!([{ "Parametro": "Trama", "Valor": valor }])))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn get_tiquete_ing(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let valor: String = conn
            .query_row(
                "SELECT valor FROM configuraciones WHERE parametro = 'No_Tiquete_Ingresos'",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "1".into());
        Ok(Json(json!([{ "Valor": valor }])))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn put_tiquete_ing(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let valor = body.get("valor").and_then(|v| v.as_str()).unwrap_or("1").to_string();
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        conn.execute(
            "INSERT INTO configuraciones (parametro, valor) VALUES ('No_Tiquete_Ingresos', ?1)
             ON CONFLICT(parametro) DO UPDATE SET valor = excluded.valor",
            params![valor],
        )?;
        Ok(())
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;
    Ok(Json(json!({ "rowsAffected": [1] })))
}

async fn get_tiquete_desp(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let valor: String = conn
            .query_row(
                "SELECT valor FROM configuraciones WHERE parametro = 'No_Tiquete_Despachos'",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "1".into());
        Ok(Json(json!([{ "Valor": valor }])))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn put_tiquete_desp(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let valor = body.get("valor").and_then(|v| v.as_str()).unwrap_or("1").to_string();
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        conn.execute(
            "INSERT INTO configuraciones (parametro, valor) VALUES ('No_Tiquete_Despachos', ?1)
             ON CONFLICT(parametro) DO UPDATE SET valor = excluded.valor",
            params![valor],
        )?;
        Ok(())
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;
    Ok(Json(json!({ "rowsAffected": [1] })))
}

async fn test_connection(Json(body): Json<Value>) -> Result<Json<Value>, AppError> {
    let host = body
        .get("host")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("VALIDATION_ERROR".into(), "El campo host es requerido.".into()))?;

    let port = body
        .get("port")
        .and_then(|v| v.as_u64())
        .filter(|&p| p >= 1 && p <= 65535)
        .ok_or_else(|| {
            AppError::BadRequest(
                "VALIDATION_ERROR".into(),
                "El campo port es requerido y debe ser un entero entre 1 y 65535.".into(),
            )
        })? as u16;

    let timeout_ms = body
        .get("timeout")
        .and_then(|v| v.as_u64())
        .unwrap_or(5000);
    if timeout_ms < 500 || timeout_ms > 30000 {
        return Err(AppError::BadRequest(
            "VALIDATION_ERROR".into(),
            "El campo timeout debe ser un entero entre 500 y 30000.".into(),
        ));
    }

    let addr = format!("{}:{}", host, port);
    let result = timeout(Duration::from_millis(timeout_ms), TcpStream::connect(&addr)).await;

    match result {
        Ok(Ok(_)) => Ok(Json(json!({
            "success": true,
            "message": format!("Conexión establecida correctamente con {}:{}", host, port)
        }))),
        Ok(Err(e)) => Ok(Json(json!({
            "success": false,
            "message": format!("No se pudo conectar: {} ({}:{})", e, host, port)
        }))),
        Err(_) => Ok(Json(json!({
            "success": false,
            "message": format!("No se pudo conectar: Timeout ({}:{})", host, port)
        }))),
    }
}
