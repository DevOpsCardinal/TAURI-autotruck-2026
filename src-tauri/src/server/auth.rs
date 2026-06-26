use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::{error::AppError, AppState, DbConn};
use std::sync::Arc;

pub const JWT_EXPIRES_SECS: i64 = 28800; // 8 hours

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: i64,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

pub fn sign_token(user_id: i64, role: &str, secret: &str) -> Result<String, AppError> {
    let now = chrono::Utc::now().timestamp();
    let claims = Claims {
        sub: user_id,
        role: role.to_string(),
        exp: (now + JWT_EXPIRES_SECS) as usize,
        iat: now as usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::from)
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let mut validation = Validation::default();
    validation.validate_exp = true;
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(AppError::from)
}

pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub nick: String,
    pub nombre: String,
    pub apellido: String,
    pub role: String,
    pub rol_id: i64,
    pub rol_nivel: i64,
    pub permissions: Vec<String>,
}

impl AuthUser {
    pub fn has_permission(&self, perm: &str) -> bool {
        self.permissions.iter().any(|p| p == perm)
    }

    pub fn require_permission(&self, perm: &str) -> Result<(), AppError> {
        if self.has_permission(perm) {
            Ok(())
        } else {
            Err(AppError::Forbidden(
                "No tienes permiso para realizar esta acción.".into(),
            ))
        }
    }
}

#[async_trait]
impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .ok_or_else(|| {
                AppError::Unauthorized("Token de autenticación requerido.".into())
            })?;

        let claims = verify_token(token, &state.jwt_secret)?;
        let user_id = claims.sub;

        let db: DbConn = state.db.clone();
        let user = tokio::task::spawn_blocking(move || -> Result<AuthUser, AppError> {
            let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

            let row = conn
                .query_row(
                    "SELECT u.id, u.nick, u.nombre, u.apellido, u.activo,
                            r.nombre AS role, r.id AS rol_id, r.nivel AS rol_nivel
                     FROM usuarios u JOIN roles r ON u.rol_id = r.id
                     WHERE u.id = ?",
                    [user_id],
                    |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, String>(3)?,
                            row.get::<_, i64>(4)?,
                            row.get::<_, String>(5)?,
                            row.get::<_, i64>(6)?,
                            row.get::<_, i64>(7)?,
                        ))
                    },
                )
                .map_err(|_| AppError::Unauthorized("Usuario no encontrado.".into()))?;

            let (id, nick, nombre, apellido, activo, role, rol_id, rol_nivel) = row;

            if activo == 0 {
                return Err(AppError::Unauthorized("Cuenta desactivada.".into()));
            }

            let mut stmt = conn.prepare(
                "SELECT p.codigo FROM permisos p
                 JOIN roles_permisos rp ON rp.permiso_id = p.id
                 WHERE rp.rol_id = ?",
            )?;
            let perms: Vec<String> = stmt
                .query_map([rol_id], |r| r.get::<_, String>(0))?
                .filter_map(|r| r.ok())
                .collect();

            Ok(AuthUser {
                id,
                nick,
                nombre,
                apellido,
                role,
                rol_id,
                rol_nivel,
                permissions: perms,
            })
        })
        .await
        .map_err(|_| AppError::Internal("spawn_blocking error".into()))??;

        Ok(user)
    }
}
