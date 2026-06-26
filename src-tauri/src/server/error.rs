use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    BadRequest(String, String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String, String),
    Validation(Vec<serde_json::Value>),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::BadRequest(code, msg) => (
                StatusCode::BAD_REQUEST,
                Json(json!({ "code": code, "message": msg })),
            )
                .into_response(),
            AppError::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "code": "UNAUTHORIZED", "message": msg })),
            )
                .into_response(),
            AppError::Forbidden(msg) => (
                StatusCode::FORBIDDEN,
                Json(json!({ "code": "FORBIDDEN", "message": msg })),
            )
                .into_response(),
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                Json(json!({ "code": "NOT_FOUND", "message": msg })),
            )
                .into_response(),
            AppError::Conflict(code, msg) => (
                StatusCode::CONFLICT,
                Json(json!({ "code": code, "message": msg })),
            )
                .into_response(),
            AppError::Validation(errors) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({ "code": "VALIDATION_ERROR", "message": "Errores de validación", "errors": errors })),
            )
                .into_response(),
            AppError::Internal(msg) => {
                eprintln!("[server] internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "code": "INTERNAL_ERROR", "message": "Error interno del servidor" })),
                )
                    .into_response()
            }
        }
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Internal(format!("DB error: {}", e))
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(e: bcrypt::BcryptError) -> Self {
        AppError::Internal(format!("Bcrypt error: {}", e))
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(e: jsonwebtoken::errors::Error) -> Self {
        AppError::Unauthorized(format!("Token inválido: {}", e))
    }
}
