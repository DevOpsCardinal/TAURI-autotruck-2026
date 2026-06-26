use std::sync::Arc;
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use rusqlite::params;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::server::{
    auth::{hash_token, sign_token, AuthUser, JWT_EXPIRES_SECS},
    error::AppError,
    AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/me", get(me))
        .route("/auth/logout", post(logout))
        .route("/auth/license-status", get(license_status))
}

const RATE_WINDOW_SECS: i64 = 900;
const MAX_ATTEMPTS: i64 = 5;

async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let username = body
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    let password = body
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if username.is_empty() {
        return Err(AppError::BadRequest(
            "VALIDATION_ERROR".into(),
            "El nombre de usuario es requerido.".into(),
        ));
    }
    if password.is_empty() {
        return Err(AppError::BadRequest(
            "VALIDATION_ERROR".into(),
            "La contraseña es requerida.".into(),
        ));
    }

    let db = state.db.clone();
    let secret = state.jwt_secret.clone();

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        // rate limiting
        let window_start = (chrono::Utc::now() - chrono::Duration::seconds(RATE_WINDOW_SECS))
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        let recent: i64 = conn.query_row(
            "SELECT COUNT(*) FROM login_attempts
             WHERE identifier = ? AND success = 0 AND created_at > ?",
            params![username, window_start],
            |r| r.get(0),
        ).unwrap_or(0);
        if recent >= MAX_ATTEMPTS {
            return Err(AppError::BadRequest(
                "TOO_MANY_ATTEMPTS".into(),
                "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.".into(),
            ));
        }

        let row = conn.query_row(
            "SELECT u.id, u.password_hash, u.activo, u.nick, u.nombre, r.nombre AS rol, r.id AS rol_id
             FROM usuarios u JOIN roles r ON u.rol_id = r.id
             WHERE u.nick = ? COLLATE NOCASE",
            [&username],
            |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                    r.get::<_, i64>(6)?,
                ))
            },
        );

        let record_fail = |conn: &rusqlite::Connection| {
            let _ = conn.execute(
                "INSERT INTO login_attempts (identifier, success) VALUES (?, 0)",
                [&username],
            );
        };

        let (user_id, hash, activo, nick, nombre, rol, rol_id) = match row {
            Ok(r) => r,
            Err(_) => {
                record_fail(&conn);
                return Err(AppError::Unauthorized("Credenciales incorrectas.".into()));
            }
        };

        if activo == 0 {
            return Err(AppError::Unauthorized("Cuenta desactivada.".into()));
        }

        let valid = bcrypt::verify(&password, &hash).unwrap_or(false);
        if !valid {
            record_fail(&conn);
            return Err(AppError::Unauthorized("Credenciales incorrectas.".into()));
        }

        // success
        conn.execute(
            "INSERT INTO login_attempts (identifier, success) VALUES (?, 1)",
            [&username],
        )?;
        conn.execute(
            "UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?",
            [user_id],
        )?;

        let access_token = sign_token(user_id, &rol, &secret)?;
        let refresh_raw = Uuid::new_v4().to_string();
        let refresh_hash = hash_token(&refresh_raw);
        let expira_en = (chrono::Utc::now() + chrono::Duration::days(30))
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();

        conn.execute(
            "INSERT INTO sesiones (usuario_id, token_hash, expira_en) VALUES (?1,?2,?3)",
            params![user_id, refresh_hash, expira_en],
        )?;

        // license info for login response
        let (days_remaining, expires_at) = get_license_info(&conn);

        Ok(Json(json!({
            "access_token": access_token,
            "refresh_token": refresh_raw,
            "token_type": "Bearer",
            "expires_in": JWT_EXPIRES_SECS,
            "user": {
                "id": user_id,
                "username": nick,
                "nombre": nombre,
                "rol": rol,
                "activo": activo == 1,
            },
            "license": {
                "expires_at": expires_at,
                "days_remaining": days_remaining,
            }
        })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn me(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    Ok(Json(json!({
        "id": user.id,
        "username": user.nick,
        "nombre": user.nombre,
        "rol": user.role,
        "activo": true,
    })))
}

async fn logout(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    let user_id = user.id;
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        conn.execute(
            "UPDATE sesiones SET activa = 0 WHERE usuario_id = ?",
            [user_id],
        )?;
        Ok(())
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;

    Ok(Json(json!({ "message": "Sesión cerrada exitosamente." })))
}

// Public endpoint — no auth required
async fn license_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let (days_remaining, expires_at) = get_license_info(&conn);

        let status = if days_remaining < 0 {
            "expired"
        } else if days_remaining <= 15 {
            "warning"
        } else {
            "active"
        };

        Ok(Json(json!({
            "expires_at": expires_at,
            "days_remaining": days_remaining.max(0),
            "status": status,
        })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

fn get_license_info(conn: &rusqlite::Connection) -> (i64, String) {
    let valor: Option<String> = conn
        .query_row(
            "SELECT valor FROM configuraciones WHERE parametro = 'licencia_expira'",
            [],
            |r| r.get(0),
        )
        .ok();

    let Some(expiry_str) = valor else {
        return (-1, String::new());
    };

    let days = chrono::DateTime::parse_from_rfc3339(&expiry_str)
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(&expiry_str, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.and_utc().fixed_offset())
        })
        .map(|exp| (exp.with_timezone(&chrono::Utc) - chrono::Utc::now()).num_days())
        .unwrap_or(-1);

    (days, expiry_str)
}
