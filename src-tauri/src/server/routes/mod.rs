use std::sync::Arc;
use axum::Router;

use crate::server::AppState;

pub mod auth_routes;
pub mod catalog_routes;
pub mod config_routes;
pub mod reports_routes;
pub mod transit_routes;
pub mod users_routes;

pub fn api_router() -> Router<Arc<AppState>> {
    Router::new()
        .merge(auth_routes::router())
        .merge(catalog_routes::router())
        .merge(config_routes::router())
        .merge(transit_routes::router())
        .merge(users_routes::router())
        .merge(reports_routes::router())
}
