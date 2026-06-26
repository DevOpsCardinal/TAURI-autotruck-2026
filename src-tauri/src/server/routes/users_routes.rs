use std::sync::Arc;
use axum::{
    extract::{Path, State},
    routing::{get, patch, post, put},
    Json, Router,
};
use rusqlite::params;
use serde_json::{json, Value};

use crate::server::{auth::AuthUser, error::AppError, AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/users/roles", get(list_roles))
        .route("/users", get(list_users))
        .route("/users", post(create_user))
        .route("/users/:id", get(get_user))
        .route("/users/:id", put(update_user))
        .route("/users/:id/status", patch(set_status))
        .route("/users/:id/password", patch(reset_password))
}

fn map_user(r: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": r.get::<_,i64>(0)?,
        "cedula": r.get::<_,String>(1)?,
        "nombre": r.get::<_,String>(2)?,
        "apellido": r.get::<_,String>(3)?,
        "nick": r.get::<_,String>(4)?,
        "email": r.get::<_,Option<String>>(5)?,
        "activo": r.get::<_,i64>(6)? == 1,
        "creado_en": r.get::<_,String>(7)?,
        "ultimo_acceso": r.get::<_,Option<String>>(8)?,
        "rol": r.get::<_,String>(9)?,
        "rol_id": r.get::<_,i64>(10)?,
    }))
}

const USER_SELECT: &str = "SELECT u.id, u.cedula, u.nombre, u.apellido, u.nick, u.email,
        u.activo, u.creado_en, u.ultimo_acceso, r.nombre AS rol, r.id AS rol_id
 FROM usuarios u JOIN roles r ON u.rol_id = r.id";

fn can_manage(requester: &AuthUser, target_nivel: i64) -> bool {
    requester.rol_nivel >= target_nivel || requester.has_permission("users:assign_super_role")
}

async fn list_roles(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    user.require_permission("users:read")?;
    let show_super = user.has_permission("users:assign_super_role");
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let mut stmt = conn.prepare(
            "SELECT id, nombre, descripcion, nivel FROM roles WHERE activo = 1 ORDER BY nivel",
        )?;
        let rows: Vec<Value> = stmt
            .query_map([], |r| {
                Ok(json!({
                    "id": r.get::<_,i64>(0)?,
                    "nombre": r.get::<_,String>(1)?,
                    "descripcion": r.get::<_,Option<String>>(2)?,
                    "nivel": r.get::<_,i64>(3)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .filter(|row| {
                if !show_super {
                    row.get("nombre").and_then(|n| n.as_str()) != Some("super_administrador")
                } else {
                    true
                }
            })
            .collect();
        Ok(Json(json!(rows)))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn list_users(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    user.require_permission("users:read")?;
    let show_super = user.has_permission("users:assign_super_role");
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let sql = format!("{} ORDER BY u.creado_en DESC", USER_SELECT);
        let mut stmt = conn.prepare(&sql)?;
        let rows: Vec<Value> = stmt
            .query_map([], map_user)?
            .filter_map(|r| r.ok())
            .filter(|row| {
                if !show_super {
                    row.get("rol").and_then(|n| n.as_str()) != Some("super_administrador")
                } else {
                    true
                }
            })
            .collect();
        Ok(Json(json!({ "data": rows, "total": rows.len() })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn get_user(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("users:read")?;
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let sql = format!("{} WHERE u.id = ?", USER_SELECT);
        conn.query_row(&sql, [id], map_user)
            .map(Json)
            .map_err(|_| AppError::NotFound("Usuario no encontrado.".into()))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

fn validate_password(pass: &str, nick: &str) -> Vec<Value> {
    let mut errors = Vec::new();
    if pass.len() < 8 {
        errors.push(json!({"field":"password","message":"La contraseña debe tener al menos 8 caracteres."}));
    }
    if pass.to_lowercase() == nick.to_lowercase() {
        errors.push(json!({"field":"password","message":"La contraseña no puede ser igual al nombre de usuario."}));
    }
    errors
}

async fn create_user(
    State(state): State<Arc<AppState>>,
    requester: AuthUser,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    requester.require_permission("users:create")?;

    let cedula = body.get("cedula").and_then(|v| v.as_str()).map(str::trim).unwrap_or("").to_string();
    let nombre = body.get("nombre").and_then(|v| v.as_str()).map(str::trim).unwrap_or("").to_string();
    let apellido = body.get("apellido").and_then(|v| v.as_str()).map(str::trim).unwrap_or("").to_string();
    let nick = body.get("nick").and_then(|v| v.as_str()).map(str::trim).map(str::to_lowercase).unwrap_or_default();
    let password = body.get("password").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let confirm = body.get("confirmPassword").and_then(|v| v.as_str()).unwrap_or("");
    let email: Option<String> = body.get("email").and_then(|v| v.as_str()).map(str::trim)
        .filter(|s| !s.is_empty()).map(str::to_string);
    let rol_id = body.get("rol_id").and_then(|v| v.as_i64()).unwrap_or(-1);

    let mut errors: Vec<Value> = Vec::new();
    if cedula.is_empty() { errors.push(json!({"field":"cedula","message":"La cédula es requerida."})); }
    if nombre.is_empty() { errors.push(json!({"field":"nombre","message":"El nombre es requerido."})); }
    if apellido.is_empty() { errors.push(json!({"field":"apellido","message":"El apellido es requerido."})); }
    if nick.is_empty() { errors.push(json!({"field":"nick","message":"El nombre de usuario es requerido."})); }
    if password.is_empty() { errors.push(json!({"field":"password","message":"La contraseña es requerida."})); }
    else { errors.extend(validate_password(&password, &nick)); }
    if password != confirm { errors.push(json!({"field":"confirmPassword","message":"Las contraseñas no coinciden."})); }
    if rol_id < 0 { errors.push(json!({"field":"rol_id","message":"El rol es requerido."})); }
    if !errors.is_empty() { return Err(AppError::Validation(errors)); }

    let db = state.db.clone();
    let req_nivel = requester.rol_nivel;
    let req_has_super = requester.has_permission("users:assign_super_role");

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        // verify role level
        let role_nivel: i64 = conn.query_row(
            "SELECT nivel FROM roles WHERE id = ?", [rol_id], |r| r.get(0)
        ).map_err(|_| AppError::BadRequest("VALIDATION_ERROR".into(), "Rol no válido.".into()))?;

        if role_nivel > req_nivel && !req_has_super {
            return Err(AppError::Forbidden(
                "No puedes asignar un rol superior al tuyo.".into(),
            ));
        }

        // duplicate checks
        let dup_nick: i64 = conn.query_row(
            "SELECT COUNT(*) FROM usuarios WHERE nick = ? COLLATE NOCASE", [&nick], |r| r.get(0)
        ).unwrap_or(0);
        if dup_nick > 0 { return Err(AppError::Conflict("DUPLICATE_NICK".into(), "El nombre de usuario ya está en uso.".into())); }

        let dup_ced: i64 = conn.query_row(
            "SELECT COUNT(*) FROM usuarios WHERE cedula = ?", [&cedula], |r| r.get(0)
        ).unwrap_or(0);
        if dup_ced > 0 { return Err(AppError::Conflict("DUPLICATE_CEDULA".into(), "La cédula ya está registrada.".into())); }

        if let Some(ref e) = email {
            let dup_em: i64 = conn.query_row(
                "SELECT COUNT(*) FROM usuarios WHERE email = ?", [e], |r| r.get(0)
            ).unwrap_or(0);
            if dup_em > 0 { return Err(AppError::Conflict("DUPLICATE_EMAIL".into(), "El email ya está registrado.".into())); }
        }

        let hash = bcrypt::hash(&password, 10).map_err(AppError::from)?;
        conn.execute(
            "INSERT INTO usuarios (cedula,nombre,apellido,nick,email,password_hash,rol_id,activo)
             VALUES (?1,?2,?3,?4,?5,?6,?7,1)",
            params![cedula, nombre, apellido, nick, email, hash, rol_id],
        )?;

        let new_id = conn.last_insert_rowid();
        let sql = format!("{} WHERE u.id = ?", USER_SELECT);
        conn.query_row(&sql, [new_id], map_user)
            .map(Json)
            .map_err(AppError::from)
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn update_user(
    State(state): State<Arc<AppState>>,
    requester: AuthUser,
    Path(id): Path<i64>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    requester.require_permission("users:edit")?;

    if body.get("nick").is_some() {
        return Err(AppError::Validation(vec![json!({
            "field": "nick",
            "message": "El nombre de usuario no se puede modificar."
        })]));
    }

    let db = state.db.clone();
    let req_nivel = requester.rol_nivel;
    let req_has_super = requester.has_permission("users:assign_super_role");
    let req_id = requester.id;

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        // verify target exists and requester can manage
        let target_nivel: i64 = conn.query_row(
            "SELECT r.nivel FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?",
            [id], |r| r.get(0)
        ).map_err(|_| AppError::NotFound("Usuario no encontrado.".into()))?;

        if target_nivel > req_nivel && !req_has_super {
            return Err(AppError::Forbidden("No puedes editar usuarios de rango superior.".into()));
        }

        let mut sets: Vec<String> = Vec::new();
        let mut vals: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(v) = body.get("cedula").and_then(|v| v.as_str()).map(str::trim) {
            if v.is_empty() { return Err(AppError::Validation(vec![json!({"field":"cedula","message":"La cédula no puede estar vacía."})])); }
            let dup: i64 = conn.query_row(
                "SELECT COUNT(*) FROM usuarios WHERE cedula = ? AND id != ?", params![v, id], |r| r.get(0)
            ).unwrap_or(0);
            if dup > 0 { return Err(AppError::Conflict("DUPLICATE_CEDULA".into(), "La cédula ya está registrada.".into())); }
            sets.push("cedula = ?".into());
            vals.push(Box::new(v.to_string()));
        }
        if let Some(v) = body.get("nombre").and_then(|v| v.as_str()).map(str::trim) {
            sets.push("nombre = ?".into()); vals.push(Box::new(v.to_string()));
        }
        if let Some(v) = body.get("apellido").and_then(|v| v.as_str()).map(str::trim) {
            sets.push("apellido = ?".into()); vals.push(Box::new(v.to_string()));
        }
        if let Some(v) = body.get("email") {
            let em: Option<String> = v.as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
            if let Some(ref e) = em {
                let dup: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM usuarios WHERE email = ? AND id != ?", params![e, id], |r| r.get(0)
                ).unwrap_or(0);
                if dup > 0 { return Err(AppError::Conflict("DUPLICATE_EMAIL".into(), "El email ya está registrado.".into())); }
            }
            sets.push("email = ?".into()); vals.push(Box::new(em));
        }
        if let Some(v) = body.get("rol_id").and_then(|v| v.as_i64()) {
            if req_id != id {
                let role_nivel: i64 = conn.query_row(
                    "SELECT nivel FROM roles WHERE id = ?", [v], |r| r.get(0)
                ).map_err(|_| AppError::BadRequest("VALIDATION_ERROR".into(), "Rol no válido.".into()))?;
                if role_nivel > req_nivel && !req_has_super {
                    return Err(AppError::Forbidden("No puedes asignar un rol superior al tuyo.".into()));
                }
                sets.push("rol_id = ?".into()); vals.push(Box::new(v));
            }
        }

        if sets.is_empty() {
            let sql = format!("{} WHERE u.id = ?", USER_SELECT);
            return conn.query_row(&sql, [id], map_user).map(Json).map_err(AppError::from);
        }

        let sql = format!("UPDATE usuarios SET {} WHERE id = ?", sets.join(", "));
        let mut stmt = conn.prepare(&sql)?;
        vals.push(Box::new(id));
        stmt.execute(rusqlite::params_from_iter(vals.iter().map(|v| v.as_ref())))?;

        let sql = format!("{} WHERE u.id = ?", USER_SELECT);
        conn.query_row(&sql, [id], map_user).map(Json).map_err(AppError::from)
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn set_status(
    State(state): State<Arc<AppState>>,
    requester: AuthUser,
    Path(id): Path<i64>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    requester.require_permission("users:toggle_status")?;

    if requester.id == id {
        return Err(AppError::BadRequest(
            "SELF_DEACTIVATION".into(),
            "No puedes desactivar tu propia cuenta.".into(),
        ));
    }

    let activo = body.get("activo").and_then(|v| v.as_bool()).ok_or_else(|| {
        AppError::BadRequest("VALIDATION_ERROR".into(), "El campo activo es requerido.".into())
    })?;

    let db = state.db.clone();
    let req_nivel = requester.rol_nivel;

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let (nick, _current_activo, rol_nombre, rol_nivel): (String, i64, String, i64) = conn
            .query_row(
                "SELECT u.nick, u.activo, r.nombre, r.nivel
                 FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .map_err(|_| AppError::NotFound("Usuario no encontrado.".into()))?;

        if rol_nivel > req_nivel {
            return Err(AppError::Forbidden("No puedes modificar usuarios de rango superior.".into()));
        }

        if !activo {
            if rol_nombre == "super_administrador" {
                let count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM usuarios u JOIN roles r ON u.rol_id = r.id
                     WHERE r.nombre = 'super_administrador' AND u.activo = 1",
                    [], |r| r.get(0),
                ).unwrap_or(0);
                if count <= 1 {
                    return Err(AppError::BadRequest(
                        "LAST_SUPERADMIN".into(),
                        "No se puede desactivar al único Super Administrador activo.".into(),
                    ));
                }
            }
            let adm_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM usuarios u JOIN roles r ON u.rol_id = r.id
                 WHERE r.nombre IN ('administrador','super_administrador') AND u.activo = 1",
                [], |r| r.get(0),
            ).unwrap_or(0);
            if adm_count <= 1 && (rol_nombre == "administrador" || rol_nombre == "super_administrador") {
                return Err(AppError::BadRequest(
                    "LAST_ADMIN".into(),
                    "No se puede desactivar al único Administrador activo del sistema.".into(),
                ));
            }
        }

        let activo_int = if activo { 1i64 } else { 0i64 };
        conn.execute("UPDATE usuarios SET activo = ? WHERE id = ?", params![activo_int, id])?;

        if !activo {
            conn.execute("UPDATE sesiones SET activa = 0 WHERE usuario_id = ?", [id])?;
        }

        Ok(Json(json!({ "id": id, "nick": nick, "activo": activo })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn reset_password(
    State(state): State<Arc<AppState>>,
    requester: AuthUser,
    Path(id): Path<i64>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    requester.require_permission("users:reset_password")?;

    let password = body.get("password").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let confirm = body.get("confirmPassword").and_then(|v| v.as_str()).unwrap_or("").to_string();

    let db = state.db.clone();
    let req_nivel = requester.rol_nivel;

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let (nick, rol_nivel): (String, i64) = conn
            .query_row(
                "SELECT u.nick, r.nivel FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|_| AppError::NotFound("Usuario no encontrado.".into()))?;

        if rol_nivel > req_nivel {
            return Err(AppError::Forbidden("No puedes restablecer contraseñas de usuarios de rango superior.".into()));
        }

        let mut errors = validate_password(&password, &nick);
        if password != confirm {
            errors.push(json!({"field":"confirmPassword","message":"Las contraseñas no coinciden."}));
        }
        if !errors.is_empty() { return Err(AppError::Validation(errors)); }

        let hash = bcrypt::hash(&password, 10).map_err(AppError::from)?;
        conn.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", params![hash, id])?;
        conn.execute("UPDATE sesiones SET activa = 0 WHERE usuario_id = ?", [id])?;

        Ok(Json(json!({ "success": true, "message": "Contraseña restablecida correctamente." })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}
