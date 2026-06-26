use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use axum::Router;
use tower_http::cors::CorsLayer;

pub mod auth;
pub mod db;
pub mod error;
pub mod routes;

pub type DbConn = Arc<Mutex<rusqlite::Connection>>;

#[derive(Clone)]
pub struct AppState {
    pub db: DbConn,
    pub jwt_secret: String,
}

pub async fn start_server(data_dir: PathBuf) -> anyhow::Result<()> {
    let db_path = data_dir.join("bioplanta.db");
    let conn = db::init_database(&db_path)?;
    let db: DbConn = Arc::new(Mutex::new(conn));

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "dev-secret-change-in-production-min-32-chars!!".to_string());

    let state = Arc::new(AppState { db, jwt_secret });

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .nest("/api", routes::api_router())
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("[server] escuchando en http://{}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
