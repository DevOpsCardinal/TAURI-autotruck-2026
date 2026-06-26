use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::server::{auth::AuthUser, error::AppError, AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/reports/ingresos", get(report_ingresos))
        .route("/reports/ingresos/:ticket/ticket-data", get(ingreso_ticket_data))
        .route("/reports/ingresos/:ticket/ticket", get(ingreso_ticket_data))
        .route("/reports/despachos", get(report_despachos))
        .route("/reports/despachos/:ticket/ticket-data", get(despacho_ticket_data))
        .route("/reports/despachos/:ticket/ticket", get(despacho_ticket_data))
        .route("/reports/transit", get(report_transit))
        .route("/reports/summary", get(report_summary))
        .route("/reports/operarios", get(report_operarios))
}

// ---------------------------------------------------------------------------
// Query parameter structs
// ---------------------------------------------------------------------------

#[derive(Deserialize, Default)]
struct IngresosQuery {
    page: Option<i64>,
    limit: Option<i64>,
    fecha_desde: Option<String>,
    fecha_hasta: Option<String>,
    planta: Option<String>,
    proveedor: Option<String>,
    materia_prima: Option<String>,
    transportadora: Option<String>,
    placa: Option<String>,
    operario: Option<String>,
    sort: Option<String>,
    export: Option<i64>,
}

#[derive(Deserialize, Default)]
struct DespachosQuery {
    page: Option<i64>,
    limit: Option<i64>,
    fecha_desde: Option<String>,
    fecha_hasta: Option<String>,
    planta: Option<String>,
    cliente: Option<String>,
    producto: Option<String>,
    transportadora: Option<String>,
    placa: Option<String>,
    operario: Option<String>,
    sort: Option<String>,
    export: Option<i64>,
}

#[derive(Deserialize, Default)]
struct TransitQuery {
    page: Option<i64>,
    limit: Option<i64>,
    fecha_desde: Option<String>,
    fecha_hasta: Option<String>,
    estado: Option<String>,
    caso: Option<String>,
    planta: Option<String>,
    placa: Option<String>,
    sort: Option<String>,
    export: Option<i64>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn parse_ingresos_sort(sort: Option<&str>) -> (&'static str, &'static str) {
    match sort.unwrap_or("fecha_desc") {
        "fecha_asc" => ("Fecha_Peso_Lleno", "ASC"),
        "neto_desc" => ("Neto", "DESC"),
        "neto_asc" => ("Neto", "ASC"),
        "tiquete_desc" => ("No_Tiquete", "DESC"),
        "tiquete_asc" => ("No_Tiquete", "ASC"),
        _ => ("Fecha_Peso_Lleno", "DESC"),
    }
}

fn parse_transit_sort(sort: Option<&str>) -> (&'static str, &'static str) {
    match sort.unwrap_or("fecha_desc") {
        "fecha_asc" => ("created_at", "ASC"),
        _ => ("created_at", "DESC"),
    }
}

fn build_pagination(total: i64, page: i64, limit: i64) -> Value {
    let total_pages = if limit > 0 {
        ((total as f64) / (limit as f64)).ceil() as i64
    } else {
        1
    };
    json!({
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    })
}

fn estado_display(estado: &str) -> &'static str {
    match estado {
        "EN_TRANSITO" => "En Tránsito",
        "COMPLETADO" => "Completado",
        "CANCELADO" => "Cancelado",
        _ => "Desconocido",
    }
}

fn nonempty(opt: &Option<String>) -> Option<&str> {
    opt.as_deref().filter(|s| !s.is_empty())
}

fn cfg(conn: &rusqlite::Connection, key: &str) -> String {
    conn.query_row(
        "SELECT valor FROM configuraciones WHERE parametro = ?",
        [key],
        |r| r.get::<_, String>(0),
    )
    .unwrap_or_default()
}

fn build_empresa(conn: &rusqlite::Connection) -> Value {
    json!({
        "nombre":    cfg(conn, "empresa_nombre"),
        "nit":       cfg(conn, "empresa_nit"),
        "direccion": cfg(conn, "empresa_direccion"),
        "ciudad":    cfg(conn, "empresa_ciudad"),
        "telefono":  cfg(conn, "empresa_telefono"),
        "logo_path": cfg(conn, "empresa_logo_path"),
        "correo":    cfg(conn, "empresa_correo"),
    })
}

fn local_datetime() -> String {
    // Returns current local datetime as "YYYY-MM-DD HH:MM:SS"
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

// ---------------------------------------------------------------------------
// Resumen del día
// ---------------------------------------------------------------------------

async fn report_summary(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<Value>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let ingresos_hoy: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Ingresos WHERE Fecha_Peso_Lleno = ?",
            [&today], |r| r.get(0),
        ).unwrap_or(0);

        let despachos_hoy: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Despachos WHERE Fecha_Peso_Lleno = ?",
            [&today], |r| r.get(0),
        ).unwrap_or(0);

        let neto_entrada_hoy: i64 = conn.query_row(
            "SELECT COALESCE(SUM(Neto),0) FROM Ingresos WHERE Fecha_Peso_Lleno = ?",
            [&today], |r| r.get(0),
        ).unwrap_or(0);

        let neto_salida_hoy: i64 = conn.query_row(
            "SELECT COALESCE(SUM(Neto),0) FROM Despachos WHERE Fecha_Peso_Lleno = ?",
            [&today], |r| r.get(0),
        ).unwrap_or(0);

        let vehiculos_activos: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Vehiculos_en_Transito WHERE estado = 'EN_TRANSITO'",
            [], |r| r.get(0),
        ).unwrap_or(0);

        // Últimos 15 movimientos (Ingresos + Despachos completados)
        let mut stmt = conn.prepare(
            "SELECT 'Ingreso' AS tipo,
                    No_Tiquete          AS no_tiquete,
                    Placa               AS placa,
                    Proveedor           AS contraparte,
                    Neto                AS neto,
                    (Fecha_Peso_Lleno || ' ' || Hora_Peso_Lleno) AS fecha_hora,
                    'COMPLETADO'        AS estado
             FROM Ingresos
             UNION ALL
             SELECT 'Despacho',
                    No_Tiquete,
                    Placa,
                    Cliente,
                    Neto,
                    (Fecha_Peso_Lleno || ' ' || Hora_Peso_Lleno),
                    'COMPLETADO'
             FROM Despachos
             ORDER BY fecha_hora DESC LIMIT 15",
        )?;

        let ultimos_movimientos: Vec<Value> = stmt
            .query_map([], |r| {
                Ok(json!({
                    "tipo":       r.get::<_,Option<String>>(0)?,
                    "no_tiquete": r.get::<_,Option<i64>>(1)?,
                    "placa":      r.get::<_,Option<String>>(2)?,
                    "contraparte":r.get::<_,Option<String>>(3)?,
                    "neto":       r.get::<_,Option<i64>>(4)?,
                    "fecha_hora": r.get::<_,Option<String>>(5)?,
                    "estado":     r.get::<_,Option<String>>(6)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(Json(json!({
            "fecha":            today,
            "ingresos_hoy":     ingresos_hoy,
            "despachos_hoy":    despachos_hoy,
            "neto_entrada_hoy": neto_entrada_hoy,
            "neto_salida_hoy":  neto_salida_hoy,
            "vehiculos_activos":vehiculos_activos,
            "ultimos_movimientos": ultimos_movimientos,
        })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Ingresos
// ---------------------------------------------------------------------------

async fn report_ingresos(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(q): Query<IngresosQuery>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("reports:read_operational")?;

    let is_export = q.export.unwrap_or(0) != 0;
    let page = q.page.unwrap_or(1).max(1);
    let limit = if is_export { 50_000i64 } else { q.limit.unwrap_or(20).clamp(1, 200) };
    let offset = if is_export { 0 } else { (page - 1) * limit };

    let (sort_col, sort_order) = parse_ingresos_sort(q.sort.as_deref());
    let sort_col = sort_col.to_string();
    let sort_order = sort_order.to_string();

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let mut conditions: Vec<String> = Vec::new();
        let mut bind_vals: Vec<String> = Vec::new();

        if let Some(v) = nonempty(&q.fecha_desde) {
            conditions.push("Fecha_Peso_Lleno >= ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.fecha_hasta) {
            conditions.push("Fecha_Peso_Lleno <= ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.planta) {
            conditions.push("Planta LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.proveedor) {
            conditions.push("Proveedor LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.materia_prima) {
            conditions.push("Materia_Prima LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.transportadora) {
            conditions.push("Transportadora LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.placa) {
            conditions.push("Placa LIKE ?".into());
            bind_vals.push(format!("%{}%", v.to_uppercase()));
        }
        if let Some(v) = nonempty(&q.operario) {
            conditions.push("Nick_Operario = ?".into());
            bind_vals.push(v.to_string());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let total: i64 = {
            let sql = format!("SELECT COUNT(*) FROM Ingresos {}", where_clause);
            let mut stmt = conn.prepare(&sql)?;
            stmt.query_row(rusqlite::params_from_iter(bind_vals.iter()), |r| r.get(0))?
        };

        let (total_bruto, total_tara, total_neto): (i64, i64, i64) = {
            let sql = format!(
                "SELECT COALESCE(SUM(Bruto),0), COALESCE(SUM(Tara),0), COALESCE(SUM(Neto),0) FROM Ingresos {}",
                where_clause
            );
            let mut stmt = conn.prepare(&sql)?;
            stmt.query_row(rusqlite::params_from_iter(bind_vals.iter()), |r| {
                Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
            })?
        };

        let data_sql = format!(
            "SELECT id, No_Tiquete, Placa, Conductor, Cedula, Materia_Prima, Planta,
                    Proveedor, Origen, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                    Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                    Operario, Nick_Operario, No_Sello, No_Shipment, No_R, No_Contenedor,
                    Observaciones, created_at
             FROM Ingresos {} ORDER BY {} {} LIMIT ? OFFSET ?",
            where_clause, sort_col, sort_order
        );

        let mut page_vals = bind_vals.clone();
        page_vals.push(limit.to_string());
        page_vals.push(offset.to_string());

        let mut stmt = conn.prepare(&data_sql)?;
        let rows: Vec<Value> = stmt
            .query_map(rusqlite::params_from_iter(page_vals.iter()), |r| {
                Ok(json!({
                    "id":               r.get::<_,i64>(0)?,
                    "no_tiquete":       r.get::<_,Option<i64>>(1)?,
                    "placa":            r.get::<_,String>(2)?,
                    "conductor":        r.get::<_,Option<String>>(3)?,
                    "cedula":           r.get::<_,Option<i64>>(4)?,
                    "materia_prima":    r.get::<_,Option<String>>(5)?,
                    "planta":           r.get::<_,Option<String>>(6)?,
                    "proveedor":        r.get::<_,Option<String>>(7)?,
                    "origen":           r.get::<_,Option<String>>(8)?,
                    "transportadora":   r.get::<_,Option<String>>(9)?,
                    "fecha_peso_vacio": r.get::<_,Option<String>>(10)?,
                    "hora_peso_vacio":  r.get::<_,Option<String>>(11)?,
                    "fecha_peso_lleno": r.get::<_,Option<String>>(12)?,
                    "hora_peso_lleno":  r.get::<_,Option<String>>(13)?,
                    "bruto":            r.get::<_,Option<i64>>(14)?,
                    "tara":             r.get::<_,Option<i64>>(15)?,
                    "neto":             r.get::<_,Option<i64>>(16)?,
                    "operario":         r.get::<_,Option<String>>(17)?,
                    "nick_operario":    r.get::<_,Option<String>>(18)?,
                    "no_sello":         r.get::<_,Option<String>>(19)?,
                    "no_shipment":      r.get::<_,Option<String>>(20)?,
                    "no_r":             r.get::<_,Option<String>>(21)?,
                    "no_contenedor":    r.get::<_,Option<String>>(22)?,
                    "observaciones":    r.get::<_,Option<String>>(23)?,
                    "created_at":       r.get::<_,Option<String>>(24)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();

        if is_export {
            Ok(Json(json!({ "data": rows })))
        } else {
            Ok(Json(json!({
                "data": rows,
                "pagination": build_pagination(total, page, limit),
                "summary": {
                    "total_bruto": total_bruto,
                    "total_tara":  total_tara,
                    "total_neto":  total_neto,
                }
            })))
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Despachos
// ---------------------------------------------------------------------------

async fn report_despachos(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(q): Query<DespachosQuery>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("reports:read_operational")?;

    let is_export = q.export.unwrap_or(0) != 0;
    let page = q.page.unwrap_or(1).max(1);
    let limit = if is_export { 50_000i64 } else { q.limit.unwrap_or(20).clamp(1, 200) };
    let offset = if is_export { 0 } else { (page - 1) * limit };

    let (sort_col, sort_order) = parse_ingresos_sort(q.sort.as_deref());
    let sort_col = sort_col.to_string();
    let sort_order = sort_order.to_string();

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let mut conditions: Vec<String> = Vec::new();
        let mut bind_vals: Vec<String> = Vec::new();

        if let Some(v) = nonempty(&q.fecha_desde) {
            conditions.push("Fecha_Peso_Lleno >= ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.fecha_hasta) {
            conditions.push("Fecha_Peso_Lleno <= ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.planta) {
            conditions.push("Planta LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.cliente) {
            conditions.push("Cliente LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.producto) {
            conditions.push("Producto LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.transportadora) {
            conditions.push("Transportadora LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.placa) {
            conditions.push("Placa LIKE ?".into());
            bind_vals.push(format!("%{}%", v.to_uppercase()));
        }
        if let Some(v) = nonempty(&q.operario) {
            conditions.push("Nick_Operario = ?".into());
            bind_vals.push(v.to_string());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let total: i64 = {
            let sql = format!("SELECT COUNT(*) FROM Despachos {}", where_clause);
            let mut stmt = conn.prepare(&sql)?;
            stmt.query_row(rusqlite::params_from_iter(bind_vals.iter()), |r| r.get(0))?
        };

        let (total_bruto, total_tara, total_neto): (i64, i64, i64) = {
            let sql = format!(
                "SELECT COALESCE(SUM(Bruto),0), COALESCE(SUM(Tara),0), COALESCE(SUM(Neto),0) FROM Despachos {}",
                where_clause
            );
            let mut stmt = conn.prepare(&sql)?;
            stmt.query_row(rusqlite::params_from_iter(bind_vals.iter()), |r| {
                Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
            })?
        };

        let data_sql = format!(
            "SELECT id, No_Tiquete, Placa, Conductor, Cedula, Producto, Planta,
                    Cliente, Destino, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                    Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                    Operario, Nick_Operario, NitCliente, No_Sello, No_Shipment,
                    No_R, No_Contenedor, observaciones, created_at
             FROM Despachos {} ORDER BY {} {} LIMIT ? OFFSET ?",
            where_clause, sort_col, sort_order
        );

        let mut page_vals = bind_vals.clone();
        page_vals.push(limit.to_string());
        page_vals.push(offset.to_string());

        let mut stmt = conn.prepare(&data_sql)?;
        let rows: Vec<Value> = stmt
            .query_map(rusqlite::params_from_iter(page_vals.iter()), |r| {
                Ok(json!({
                    "id":               r.get::<_,i64>(0)?,
                    "no_tiquete":       r.get::<_,Option<i64>>(1)?,
                    "placa":            r.get::<_,String>(2)?,
                    "conductor":        r.get::<_,Option<String>>(3)?,
                    "cedula":           r.get::<_,Option<i64>>(4)?,
                    "producto":         r.get::<_,Option<String>>(5)?,
                    "planta":           r.get::<_,Option<String>>(6)?,
                    "cliente":          r.get::<_,Option<String>>(7)?,
                    "destino":          r.get::<_,Option<String>>(8)?,
                    "transportadora":   r.get::<_,Option<String>>(9)?,
                    "fecha_peso_vacio": r.get::<_,Option<String>>(10)?,
                    "hora_peso_vacio":  r.get::<_,Option<String>>(11)?,
                    "fecha_peso_lleno": r.get::<_,Option<String>>(12)?,
                    "hora_peso_lleno":  r.get::<_,Option<String>>(13)?,
                    "bruto":            r.get::<_,Option<i64>>(14)?,
                    "tara":             r.get::<_,Option<i64>>(15)?,
                    "neto":             r.get::<_,Option<i64>>(16)?,
                    "operario":         r.get::<_,Option<String>>(17)?,
                    "nick_operario":    r.get::<_,Option<String>>(18)?,
                    "nit_cliente":      r.get::<_,Option<String>>(19)?,
                    "no_sello":         r.get::<_,Option<String>>(20)?,
                    "no_shipment":      r.get::<_,Option<String>>(21)?,
                    "no_r":             r.get::<_,Option<String>>(22)?,
                    "no_contenedor":    r.get::<_,Option<String>>(23)?,
                    "observaciones":    r.get::<_,Option<String>>(24)?,
                    "created_at":       r.get::<_,Option<String>>(25)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();

        if is_export {
            Ok(Json(json!({ "data": rows })))
        } else {
            Ok(Json(json!({
                "data": rows,
                "pagination": build_pagination(total, page, limit),
                "summary": {
                    "total_bruto": total_bruto,
                    "total_tara":  total_tara,
                    "total_neto":  total_neto,
                }
            })))
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Historial de tránsito (todos los estados)
// ---------------------------------------------------------------------------

async fn report_transit(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(q): Query<TransitQuery>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("reports:read_operational")?;

    let is_export = q.export.unwrap_or(0) != 0;
    let page = q.page.unwrap_or(1).max(1);
    let limit = if is_export { 50_000i64 } else { q.limit.unwrap_or(20).clamp(1, 200) };
    let offset = if is_export { 0 } else { (page - 1) * limit };

    let (sort_col, sort_order) = parse_transit_sort(q.sort.as_deref());
    let sort_col = sort_col.to_string();
    let sort_order = sort_order.to_string();

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let mut conditions: Vec<String> = Vec::new();
        let mut bind_vals: Vec<String> = Vec::new();

        if let Some(v) = nonempty(&q.fecha_desde) {
            conditions.push("created_at >= ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.fecha_hasta) {
            // Include full day
            conditions.push("created_at <= ?".into());
            bind_vals.push(format!("{} 23:59:59", v));
        }
        if let Some(v) = nonempty(&q.estado) {
            conditions.push("estado = ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.caso) {
            conditions.push("Caso = ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.planta) {
            conditions.push("Planta LIKE ?".into());
            bind_vals.push(v.to_string());
        }
        if let Some(v) = nonempty(&q.placa) {
            conditions.push("Placa LIKE ?".into());
            bind_vals.push(format!("%{}%", v.to_uppercase()));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let total: i64 = {
            let sql = format!("SELECT COUNT(*) FROM Vehiculos_en_Transito {}", where_clause);
            let mut stmt = conn.prepare(&sql)?;
            stmt.query_row(rusqlite::params_from_iter(bind_vals.iter()), |r| r.get(0))?
        };

        let data_sql = format!(
            "SELECT id, No_Interno, Placa, Conductor, Cedula, Caso, estado,
                    Planta, MateriaPrima_Producto, Cliente_Proveedor, Transportadora,
                    Origen_Destino, Bruto, Tara, Neto, Tipo_Vehiculo,
                    Operario, Nick_Operario, Fecha_peso_vacio, Hora_peso_vacio,
                    No_Tiquete, No_Sello, No_Shipment, No_R, No_Contenedor,
                    Observaciones, motivo_cancelacion, cancelado_en, completado_en, created_at
             FROM Vehiculos_en_Transito {} ORDER BY {} {} LIMIT ? OFFSET ?",
            where_clause, sort_col, sort_order
        );

        let mut page_vals = bind_vals.clone();
        page_vals.push(limit.to_string());
        page_vals.push(offset.to_string());

        let mut stmt = conn.prepare(&data_sql)?;
        let rows: Vec<Value> = stmt
            .query_map(rusqlite::params_from_iter(page_vals.iter()), |r| {
                let estado: Option<String> = r.get(6)?;
                let display = estado
                    .as_deref()
                    .map(estado_display)
                    .unwrap_or("Desconocido");
                Ok(json!({
                    "id":                   r.get::<_,i64>(0)?,
                    "no_interno":           r.get::<_,Option<String>>(1)?,
                    "placa":                r.get::<_,Option<String>>(2)?,
                    "conductor":            r.get::<_,Option<String>>(3)?,
                    "cedula":               r.get::<_,Option<i64>>(4)?,
                    "caso":                 r.get::<_,Option<String>>(5)?,
                    "estado":               estado,
                    "estado_display":       display,
                    "planta":               r.get::<_,Option<String>>(7)?,
                    "materia_prima_producto": r.get::<_,Option<String>>(8)?,
                    "cliente_proveedor":    r.get::<_,Option<String>>(9)?,
                    "transportadora":       r.get::<_,Option<String>>(10)?,
                    "origen_destino":       r.get::<_,Option<String>>(11)?,
                    "bruto":                r.get::<_,Option<i64>>(12)?,
                    "tara":                 r.get::<_,Option<i64>>(13)?,
                    "neto":                 r.get::<_,Option<i64>>(14)?,
                    "tipo_vehiculo":        r.get::<_,Option<String>>(15)?,
                    "operario":             r.get::<_,Option<String>>(16)?,
                    "nick_operario":        r.get::<_,Option<String>>(17)?,
                    "fecha_peso_vacio":     r.get::<_,Option<String>>(18)?,
                    "hora_peso_vacio":      r.get::<_,Option<String>>(19)?,
                    "no_tiquete":           r.get::<_,Option<i64>>(20)?,
                    "no_sello":             r.get::<_,Option<String>>(21)?,
                    "no_shipment":          r.get::<_,Option<String>>(22)?,
                    "no_r":                 r.get::<_,Option<String>>(23)?,
                    "no_contenedor":        r.get::<_,Option<String>>(24)?,
                    "observaciones":        r.get::<_,Option<String>>(25)?,
                    "motivo_cancelacion":   r.get::<_,Option<String>>(26)?,
                    "cancelado_en":         r.get::<_,Option<String>>(27)?,
                    "completado_en":        r.get::<_,Option<String>>(28)?,
                    "created_at":           r.get::<_,Option<String>>(29)?,
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();

        if is_export {
            Ok(Json(json!({ "data": rows })))
        } else {
            Ok(Json(json!({
                "data": rows,
                "pagination": build_pagination(total, page, limit),
            })))
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Tiquete de reimpresión — Ingreso
// ---------------------------------------------------------------------------

async fn ingreso_ticket_data(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(ticket): Path<i64>,
) -> Result<Json<Value>, AppError> {
    eprintln!("[reprint] ingreso_ticket_data called with ticket={}", ticket);
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        struct IngresoRow {
            no_tiquete:       i64,
            placa:            String,
            conductor:        Option<String>,
            cedula:           Option<i64>,
            materia_prima:    Option<String>,
            planta:           Option<String>,
            proveedor:        Option<String>,
            origen:           Option<String>,
            transportadora:   Option<String>,
            fecha_vacio:      Option<String>,
            hora_vacio:       Option<String>,
            fecha_lleno:      Option<String>,
            hora_lleno:       Option<String>,
            bruto:            Option<i64>,
            tara:             Option<i64>,
            neto:             Option<i64>,
            operario:         Option<String>,
            nick_operario:    Option<String>,
            no_sello:         Option<String>,
            no_shipment:      Option<String>,
            no_r:             Option<String>,
            no_contenedor:    Option<String>,
            observaciones:    Option<String>,
        }

        let row = conn.query_row(
            "SELECT No_Tiquete, Placa, Conductor, Cedula, Materia_Prima, Planta,
                    Proveedor, Origen, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                    Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                    Operario, Nick_Operario, No_Sello, No_Shipment, No_R, No_Contenedor,
                    Observaciones
             FROM Ingresos WHERE No_Tiquete = ?",
            [ticket],
            |r| {
                Ok(IngresoRow {
                    no_tiquete:     r.get(0)?,
                    placa:          r.get::<_,String>(1).unwrap_or_default(),
                    conductor:      r.get(2)?,
                    cedula:         r.get(3)?,
                    materia_prima:  r.get(4)?,
                    planta:         r.get(5)?,
                    proveedor:      r.get(6)?,
                    origen:         r.get(7)?,
                    transportadora: r.get(8)?,
                    fecha_vacio:    r.get(9)?,
                    hora_vacio:     r.get(10)?,
                    fecha_lleno:    r.get(11)?,
                    hora_lleno:     r.get(12)?,
                    bruto:          r.get(13)?,
                    tara:           r.get(14)?,
                    neto:           r.get(15)?,
                    operario:       r.get(16)?,
                    nick_operario:  r.get(17)?,
                    no_sello:       r.get(18)?,
                    no_shipment:    r.get(19)?,
                    no_r:           r.get(20)?,
                    no_contenedor:  r.get(21)?,
                    observaciones:  r.get(22)?,
                })
            },
        );

        match row {
            Ok(d) => {
                eprintln!("[reprint] ingreso found: no_tiquete={}, placa={}", d.no_tiquete, d.placa);
                let empresa = build_empresa(&conn);
                let ticket_data = json!({
                    "empresa": empresa,
                    "tiquete": {
                        "numero":         d.no_tiquete,
                        "codigo_visual":  d.no_tiquete.to_string(),
                        "tipo_operacion": "Ingreso",
                        "estado":         "REIMPRESION"
                    },
                    "vehiculo": {
                        "placa":          d.placa,
                        "tipo":           "",
                        "transportadora": d.transportadora.unwrap_or_default()
                    },
                    "conductor": {
                        "nombre": d.conductor.unwrap_or_default(),
                        "cedula": d.cedula.map(|c| c.to_string()).unwrap_or_default()
                    },
                    "mercancia": {
                        "descripcion":          d.materia_prima.unwrap_or_default(),
                        "contraparte_label":    "Proveedor",
                        "contraparte":          d.proveedor.unwrap_or_default(),
                        "contraparte_nit":      "",
                        "planta":               d.planta.unwrap_or_default(),
                        "origen_destino_label": "Origen",
                        "origen_destino":       d.origen.unwrap_or_default()
                    },
                    "pesaje": {
                        "bruto_kg":             d.bruto.unwrap_or(0),
                        "tara_kg":              d.tara.unwrap_or(0),
                        "neto_kg":              d.neto.unwrap_or(0),
                        "fecha_primer_pesaje":  d.fecha_vacio.unwrap_or_default(),
                        "hora_primer_pesaje":   d.hora_vacio.unwrap_or_default(),
                        "fecha_segundo_pesaje": d.fecha_lleno,
                        "hora_segundo_pesaje":  d.hora_lleno
                    },
                    "referencias": {
                        "no_sello":      d.no_sello,
                        "no_shipment":   d.no_shipment,
                        "no_r":          d.no_r,
                        "no_contenedor": d.no_contenedor
                    },
                    "observaciones": d.observaciones.unwrap_or_default(),
                    "operario": {
                        "nombre": d.operario.unwrap_or_default(),
                        "nick":   d.nick_operario.unwrap_or_default()
                    },
                    "bascula":     "",
                    "generado_en": local_datetime()
                });
                Ok(Json(ticket_data))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                eprintln!("[reprint] ingreso NOT found: no_tiquete={}", ticket);
                Err(AppError::NotFound("Tiquete de ingreso no encontrado.".into()))
            }
            Err(e) => {
                eprintln!("[reprint] ingreso DB error: {:?}", e);
                Err(AppError::from(e))
            }
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Tiquete de reimpresión — Despacho
// ---------------------------------------------------------------------------

async fn despacho_ticket_data(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(ticket): Path<i64>,
) -> Result<Json<Value>, AppError> {
    eprintln!("[reprint] despacho_ticket_data called with ticket={}", ticket);
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        struct DespachoRow {
            no_tiquete:     i64,
            placa:          String,
            conductor:      Option<String>,
            cedula:         Option<i64>,
            producto:       Option<String>,
            planta:         Option<String>,
            cliente:        Option<String>,
            destino:        Option<String>,
            transportadora: Option<String>,
            fecha_vacio:    Option<String>,
            hora_vacio:     Option<String>,
            fecha_lleno:    Option<String>,
            hora_lleno:     Option<String>,
            bruto:          Option<i64>,
            tara:           Option<i64>,
            neto:           Option<i64>,
            operario:       Option<String>,
            nick_operario:  Option<String>,
            nit_cliente:    Option<String>,
            no_sello:       Option<String>,
            no_shipment:    Option<String>,
            no_r:           Option<String>,
            no_contenedor:  Option<String>,
            observaciones:  Option<String>,
        }

        let row = conn.query_row(
            "SELECT No_Tiquete, Placa, Conductor, Cedula, Producto, Planta,
                    Cliente, Destino, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                    Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                    Operario, Nick_Operario, NitCliente, No_Sello, No_Shipment,
                    No_R, No_Contenedor, observaciones
             FROM Despachos WHERE No_Tiquete = ?",
            [ticket],
            |r| {
                Ok(DespachoRow {
                    no_tiquete:     r.get(0)?,
                    placa:          r.get::<_,String>(1).unwrap_or_default(),
                    conductor:      r.get(2)?,
                    cedula:         r.get(3)?,
                    producto:       r.get(4)?,
                    planta:         r.get(5)?,
                    cliente:        r.get(6)?,
                    destino:        r.get(7)?,
                    transportadora: r.get(8)?,
                    fecha_vacio:    r.get(9)?,
                    hora_vacio:     r.get(10)?,
                    fecha_lleno:    r.get(11)?,
                    hora_lleno:     r.get(12)?,
                    bruto:          r.get(13)?,
                    tara:           r.get(14)?,
                    neto:           r.get(15)?,
                    operario:       r.get(16)?,
                    nick_operario:  r.get(17)?,
                    nit_cliente:    r.get(18)?,
                    no_sello:       r.get(19)?,
                    no_shipment:    r.get(20)?,
                    no_r:           r.get(21)?,
                    no_contenedor:  r.get(22)?,
                    observaciones:  r.get(23)?,
                })
            },
        );

        match row {
            Ok(d) => {
                let empresa = build_empresa(&conn);
                let ticket_data = json!({
                    "empresa": empresa,
                    "tiquete": {
                        "numero":         d.no_tiquete,
                        "codigo_visual":  d.no_tiquete.to_string(),
                        "tipo_operacion": "Despacho",
                        "estado":         "REIMPRESION"
                    },
                    "vehiculo": {
                        "placa":          d.placa,
                        "tipo":           "",
                        "transportadora": d.transportadora.unwrap_or_default()
                    },
                    "conductor": {
                        "nombre": d.conductor.unwrap_or_default(),
                        "cedula": d.cedula.map(|c| c.to_string()).unwrap_or_default()
                    },
                    "mercancia": {
                        "descripcion":          d.producto.unwrap_or_default(),
                        "contraparte_label":    "Cliente",
                        "contraparte":          d.cliente.unwrap_or_default(),
                        "contraparte_nit":      d.nit_cliente.unwrap_or_default(),
                        "planta":               d.planta.unwrap_or_default(),
                        "origen_destino_label": "Destino",
                        "origen_destino":       d.destino.unwrap_or_default()
                    },
                    "pesaje": {
                        "bruto_kg":             d.bruto.unwrap_or(0),
                        "tara_kg":              d.tara.unwrap_or(0),
                        "neto_kg":              d.neto.unwrap_or(0),
                        "fecha_primer_pesaje":  d.fecha_vacio.unwrap_or_default(),
                        "hora_primer_pesaje":   d.hora_vacio.unwrap_or_default(),
                        "fecha_segundo_pesaje": d.fecha_lleno,
                        "hora_segundo_pesaje":  d.hora_lleno
                    },
                    "referencias": {
                        "no_sello":      d.no_sello,
                        "no_shipment":   d.no_shipment,
                        "no_r":          d.no_r,
                        "no_contenedor": d.no_contenedor
                    },
                    "observaciones": d.observaciones.unwrap_or_default(),
                    "operario": {
                        "nombre": d.operario.unwrap_or_default(),
                        "nick":   d.nick_operario.unwrap_or_default()
                    },
                    "bascula":     "",
                    "generado_en": local_datetime()
                });
                Ok(Json(ticket_data))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                eprintln!("[reprint] despacho NOT found: no_tiquete={}", ticket);
                Err(AppError::NotFound("Tiquete de despacho no encontrado.".into()))
            }
            Err(e) => {
                eprintln!("[reprint] despacho DB error: {:?}", e);
                Err(AppError::from(e))
            }
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

// ---------------------------------------------------------------------------
// Operarios
// ---------------------------------------------------------------------------

async fn report_operarios(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
) -> Result<Json<Value>, AppError> {
    user.require_permission("reports:read_operational")?;
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT Nick_Operario FROM Ingresos WHERE Nick_Operario IS NOT NULL
             UNION
             SELECT DISTINCT Nick_Operario FROM Despachos WHERE Nick_Operario IS NOT NULL
             ORDER BY Nick_Operario",
        )?;
        let operarios: Vec<Value> = stmt
            .query_map([], |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .map(|s| json!(s))
            .collect();
        Ok(Json(json!(operarios)))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}
