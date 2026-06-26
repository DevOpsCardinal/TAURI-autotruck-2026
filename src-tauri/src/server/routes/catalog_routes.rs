use std::sync::Arc;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use rusqlite::params;
use serde_json::{json, Value};

use crate::server::{auth::AuthUser, error::AppError, AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/conductores", get(get_conductores))
        .route("/plantas", get(get_plantas))
        .route("/proveedores", get(get_proveedores))
        .route("/clientes", get(get_clientes))
        .route("/transportadoras", get(get_transportadoras))
        .route("/origenes", get(get_origenes))
        .route("/destinos", get(get_destinos))
        .route("/materias", get(get_materias))
        .route("/productos", get(get_productos))
        .route("/catalogs/entries/:key", post(post_catalog))
        .route("/catalogs/entries/:key/:id", put(put_catalog))
        .route("/catalogs/entries/:key/:id", delete(delete_catalog))
}

macro_rules! simple_catalog_get {
    ($fn_name:ident, $sql:expr) => {
        async fn $fn_name(
            State(state): State<Arc<AppState>>,
            _user: AuthUser,
        ) -> Result<Json<Value>, AppError> {
            let db = state.db.clone();
            tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
                let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
                let mut stmt = conn.prepare($sql)?;
                let rows: Vec<Value> = stmt
                    .query_map([], |r| {
                        let mut obj = serde_json::Map::new();
                        for i in 0..r.as_ref().column_count() {
                            let name = r.as_ref().column_name(i).unwrap_or("col").to_string();
                            let val: Value = match r.get_ref(i)? {
                                rusqlite::types::ValueRef::Null => Value::Null,
                                rusqlite::types::ValueRef::Integer(n) => json!(n),
                                rusqlite::types::ValueRef::Real(f) => json!(f),
                                rusqlite::types::ValueRef::Text(t) => {
                                    json!(String::from_utf8_lossy(t).to_string())
                                }
                                rusqlite::types::ValueRef::Blob(_) => Value::Null,
                            };
                            obj.insert(name, val);
                        }
                        Ok(Value::Object(obj))
                    })?
                    .filter_map(|r| r.ok())
                    .collect();
                Ok(Json(Value::Array(rows)))
            })
            .await
            .map_err(|_| AppError::Internal("spawn_blocking".into()))?
        }
    };
}

simple_catalog_get!(
    get_conductores,
    "SELECT id, Nombre, Cedula, Fecha_Vencimiento_Licencia FROM Conductores ORDER BY Nombre"
);
simple_catalog_get!(
    get_plantas,
    "SELECT id, Nombre, Codigo FROM Plantas ORDER BY Nombre"
);
simple_catalog_get!(
    get_proveedores,
    "SELECT id, NIT, Nombre, Telefono, Direccion FROM Proveedores ORDER BY Nombre"
);
simple_catalog_get!(
    get_clientes,
    "SELECT id, NIT, Nombre, Telefono, Direccion FROM Clientes ORDER BY Nombre"
);
simple_catalog_get!(
    get_transportadoras,
    "SELECT id, NIT, Nombre, Telefono, Direccion FROM Transportadoras ORDER BY Nombre"
);
simple_catalog_get!(
    get_origenes,
    "SELECT id, Nombre, Codigo FROM Origenes ORDER BY Nombre"
);
simple_catalog_get!(
    get_destinos,
    "SELECT id, Nombre, Codigo FROM Destinos ORDER BY Nombre"
);
simple_catalog_get!(
    get_materias,
    "SELECT id, Nombre, Codigo FROM Materia_Prima ORDER BY Nombre"
);
simple_catalog_get!(
    get_productos,
    "SELECT id, Nombre, Codigo FROM Productos ORDER BY Nombre"
);

// ---- Catalog write operations ----

struct CatalogDef {
    table: &'static str,
    id_field: &'static str,    // NIT, Codigo, or Cedula for conductores
    name_field: &'static str,  // Nombre
    auto_code: bool,           // true = integer code auto-assigned
    nit_catalog: bool,         // needs NIT unique field
    needs_telefono: bool,
    is_conductor: bool,
}

fn catalog_def(key: &str) -> Option<CatalogDef> {
    match key {
        "conductores" => Some(CatalogDef {
            table: "Conductores",
            id_field: "Cedula",
            name_field: "Nombre",
            auto_code: false,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: true,
        }),
        "plantas" => Some(CatalogDef {
            table: "Plantas",
            id_field: "Codigo",
            name_field: "Nombre",
            auto_code: true,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: false,
        }),
        "origenes" => Some(CatalogDef {
            table: "Origenes",
            id_field: "Codigo",
            name_field: "Nombre",
            auto_code: true,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: false,
        }),
        "destinos" => Some(CatalogDef {
            table: "Destinos",
            id_field: "Codigo",
            name_field: "Nombre",
            auto_code: true,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: false,
        }),
        "materias" => Some(CatalogDef {
            table: "Materia_Prima",
            id_field: "Codigo",
            name_field: "Nombre",
            auto_code: true,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: false,
        }),
        "productos" => Some(CatalogDef {
            table: "Productos",
            id_field: "Codigo",
            name_field: "Nombre",
            auto_code: true,
            nit_catalog: false,
            needs_telefono: false,
            is_conductor: false,
        }),
        "proveedores" => Some(CatalogDef {
            table: "Proveedores",
            id_field: "NIT",
            name_field: "Nombre",
            auto_code: false,
            nit_catalog: true,
            needs_telefono: true,
            is_conductor: false,
        }),
        "clientes" => Some(CatalogDef {
            table: "Clientes",
            id_field: "NIT",
            name_field: "Nombre",
            auto_code: false,
            nit_catalog: true,
            needs_telefono: true,
            is_conductor: false,
        }),
        "transportadoras" => Some(CatalogDef {
            table: "Transportadoras",
            id_field: "NIT",
            name_field: "Nombre",
            auto_code: false,
            nit_catalog: true,
            needs_telefono: true,
            is_conductor: false,
        }),
        _ => None,
    }
}

fn str_field(body: &Value, field: &str) -> Option<String> {
    body.get(field)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

async fn post_catalog(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(key): Path<String>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    user.require_permission("catalogs:write")?;

    let def = catalog_def(&key)
        .ok_or_else(|| AppError::NotFound("Catálogo no encontrado.".into()))?;

    let nombre = str_field(&body, "Nombre").ok_or_else(|| {
        AppError::BadRequest("VALIDATION_ERROR".into(), "El campo Nombre es requerido.".into())
    })?;

    let db = state.db.clone();
    let row = tokio::task::spawn_blocking(move || -> Result<Value, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        if def.is_conductor {
            let cedula = body.get("Cedula").and_then(|v| v.as_i64()).ok_or_else(|| {
                AppError::BadRequest(
                    "VALIDATION_ERROR".into(),
                    "El campo Cedula es requerido y debe ser un número.".into(),
                )
            })?;
            let fecha = body.get("Fecha_Vencimiento_Licencia").and_then(|v| v.as_str()).map(str::trim).map(str::to_string);

            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM Conductores WHERE Cedula = ?", [cedula], |r| r.get(0)
            ).unwrap_or(0);
            if exists > 0 {
                return Err(AppError::Conflict(
                    "DUPLICATE_CEDULA".into(),
                    "Ya existe un conductor con esa cédula.".into(),
                ));
            }

            conn.execute(
                "INSERT INTO Conductores (Nombre, Cedula, Fecha_Vencimiento_Licencia) VALUES (?1,?2,?3)",
                params![nombre, cedula, fecha],
            )?;
            let id = conn.last_insert_rowid();
            return Ok(json!({
                "id": id, "Nombre": nombre, "Cedula": cedula, "Fecha_Vencimiento_Licencia": fecha
            }));
        }

        if def.nit_catalog {
            let nit = str_field(&body, "NIT").ok_or_else(|| {
                AppError::BadRequest(
                    "VALIDATION_ERROR".into(),
                    "El campo NIT es requerido.".into(),
                )
            })?;
            let telefono = str_field(&body, "Telefono");
            let direccion = str_field(&body, "Direccion");

            let dup: i64 = conn.query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE NIT = ?", def.table),
                [&nit],
                |r| r.get(0),
            ).unwrap_or(0);
            if dup > 0 {
                return Err(AppError::Conflict(
                    "DUPLICATE_NIT".into(),
                    "Ya existe un registro con ese NIT.".into(),
                ));
            }

            conn.execute(
                &format!(
                    "INSERT INTO {} (NIT, Nombre, Telefono, Direccion) VALUES (?1,?2,?3,?4)",
                    def.table
                ),
                params![nit, nombre, telefono, direccion],
            )?;
            let id = conn.last_insert_rowid();
            return Ok(json!({
                "id": id, "NIT": nit, "Nombre": nombre,
                "Telefono": telefono, "Direccion": direccion
            }));
        }

        // auto-code catalog (plantas, origenes, destinos, materias, productos)
        let max_code: Option<i64> = conn
            .query_row(
                &format!(
                    "SELECT MAX(CAST(Codigo AS INTEGER)) FROM {} WHERE Codigo IS NOT NULL AND Codigo != ''",
                    def.table
                ),
                [],
                |r| r.get(0),
            )
            .ok();
        let next_code = max_code.unwrap_or(0) + 1;
        let codigo = next_code.to_string();

        conn.execute(
            &format!("INSERT INTO {} (Nombre, Codigo) VALUES (?1,?2)", def.table),
            params![nombre, codigo],
        )?;
        let id = conn.last_insert_rowid();
        Ok(json!({ "id": id, "Nombre": nombre, "Codigo": codigo }))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;

    Ok((StatusCode::CREATED, Json(row)))
}

async fn put_catalog(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((key, id)): Path<(String, i64)>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("catalogs:write")?;

    let def = catalog_def(&key)
        .ok_or_else(|| AppError::NotFound("Catálogo no encontrado.".into()))?;

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        // check exists
        let exists: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE id = ?", def.table),
                [id],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if exists == 0 {
            return Err(AppError::NotFound("Registro no encontrado.".into()));
        }

        if def.is_conductor {
            let nombre = str_field(&body, "Nombre").ok_or_else(|| {
                AppError::BadRequest("VALIDATION_ERROR".into(), "El campo Nombre es requerido.".into())
            })?;
            let fecha = body.get("Fecha_Vencimiento_Licencia").and_then(|v| v.as_str()).map(str::trim).map(str::to_string);
            conn.execute(
                "UPDATE Conductores SET Nombre=?1, Fecha_Vencimiento_Licencia=?2 WHERE id=?3",
                params![nombre, fecha, id],
            )?;
            let row = conn.query_row(
                "SELECT id, Nombre, Cedula, Fecha_Vencimiento_Licencia FROM Conductores WHERE id = ?",
                [id],
                |r| Ok(json!({
                    "id": r.get::<_,i64>(0)?,
                    "Nombre": r.get::<_,String>(1)?,
                    "Cedula": r.get::<_,Option<i64>>(2)?,
                    "Fecha_Vencimiento_Licencia": r.get::<_,Option<String>>(3)?,
                })),
            )?;
            return Ok(Json(row));
        }

        if def.nit_catalog {
            let nombre = str_field(&body, "Nombre").ok_or_else(|| {
                AppError::BadRequest("VALIDATION_ERROR".into(), "El campo Nombre es requerido.".into())
            })?;
            let nit = str_field(&body, "NIT");
            let telefono = str_field(&body, "Telefono");
            let direccion = str_field(&body, "Direccion");

            // check old name for history
            let old_nombre: String = conn
                .query_row(
                    &format!("SELECT Nombre FROM {} WHERE id = ?", def.table),
                    [id],
                    |r| r.get(0),
                )
                .unwrap_or_default();

            if let Some(ref nit_val) = nit {
                let dup: i64 = conn
                    .query_row(
                        &format!("SELECT COUNT(*) FROM {} WHERE NIT = ? AND id != ?", def.table),
                        params![nit_val, id],
                        |r| r.get(0),
                    )
                    .unwrap_or(0);
                if dup > 0 {
                    return Err(AppError::Conflict(
                        "DUPLICATE_NIT".into(),
                        "Ya existe un registro con ese NIT.".into(),
                    ));
                }
            }

            let current_nit: Option<String> = conn
                .query_row(
                    &format!("SELECT NIT FROM {} WHERE id = ?", def.table),
                    [id],
                    |r| r.get(0),
                )
                .ok();

            let final_nit = nit.or(current_nit);

            conn.execute(
                &format!(
                    "UPDATE {} SET NIT=?1, Nombre=?2, Telefono=?3, Direccion=?4 WHERE id=?5",
                    def.table
                ),
                params![final_nit, nombre, telefono, direccion, id],
            )?;

            // log name history if renamed
            if nombre != old_nombre {
                if let Some(ref id_val) = final_nit {
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO Catalogo_Nombres_Historicos (catalogo, identificador, nombre)
                         VALUES (?1,?2,?3)",
                        params![def.table, id_val, old_nombre],
                    );
                }
            }

            let row = conn.query_row(
                &format!(
                    "SELECT id, NIT, Nombre, Telefono, Direccion FROM {} WHERE id = ?",
                    def.table
                ),
                [id],
                |r| Ok(json!({
                    "id": r.get::<_,i64>(0)?,
                    "NIT": r.get::<_,Option<String>>(1)?,
                    "Nombre": r.get::<_,String>(2)?,
                    "Telefono": r.get::<_,Option<String>>(3)?,
                    "Direccion": r.get::<_,Option<String>>(4)?,
                })),
            )?;
            return Ok(Json(row));
        }

        // auto-code catalog update
        let nombre = str_field(&body, "Nombre").ok_or_else(|| {
            AppError::BadRequest("VALIDATION_ERROR".into(), "El campo Nombre es requerido.".into())
        })?;

        let old_nombre: String = conn
            .query_row(
                &format!("SELECT Nombre FROM {} WHERE id = ?", def.table),
                [id],
                |r| r.get(0),
            )
            .unwrap_or_default();

        conn.execute(
            &format!("UPDATE {} SET Nombre=?1 WHERE id=?2", def.table),
            params![nombre, id],
        )?;

        // log name history
        if nombre != old_nombre {
            let codigo: Option<String> = conn
                .query_row(
                    &format!("SELECT Codigo FROM {} WHERE id = ?", def.table),
                    [id],
                    |r| r.get(0),
                )
                .ok();
            if let Some(ref cod) = codigo {
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO Catalogo_Nombres_Historicos (catalogo, identificador, nombre)
                     VALUES (?1,?2,?3)",
                    params![def.table, cod, old_nombre],
                );
            }
        }

        let row = conn.query_row(
            &format!("SELECT id, Nombre, Codigo FROM {} WHERE id = ?", def.table),
            [id],
            |r| Ok(json!({
                "id": r.get::<_,i64>(0)?,
                "Nombre": r.get::<_,String>(1)?,
                "Codigo": r.get::<_,Option<String>>(2)?,
            })),
        )?;
        Ok(Json(row))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn delete_catalog(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path((key, id)): Path<(String, i64)>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("catalogs:delete")?;

    let def = catalog_def(&key)
        .ok_or_else(|| AppError::NotFound("Catálogo no encontrado.".into()))?;

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let exists: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE id = ?", def.table),
                [id],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if exists == 0 {
            return Err(AppError::NotFound("Registro no encontrado.".into()));
        }

        conn.execute(
            &format!("DELETE FROM {} WHERE id = ?", def.table),
            [id],
        )?;

        Ok(Json(json!({ "deleted": true, "id": id })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}
