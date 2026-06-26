use std::collections::HashMap;
use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use rusqlite::params;
use serde_json::{json, Value};

use crate::server::{auth::AuthUser, error::AppError, AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/transit", get(list_transit))
        .route("/transit", post(create_transit))
        .route("/transit/:placa", get(get_transit))
        .route("/transit/:placa/salida", post(register_salida))
        .route("/transit/:placa", delete(cancel_transit))
}

fn local_now() -> (String, String) {
    let now = chrono::Local::now();
    let fecha = now.format("%Y-%m-%d").to_string();
    let hora = now.format("%H:%M:%S").to_string();
    (fecha, hora)
}

fn local_datetime() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
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

// Returns camelCase keys matching the frontend TransitRecord interface
fn row_to_transit_value(r: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": r.get::<_,i64>(0)?,
        "placa": r.get::<_,Option<String>>(1)?,
        "conductor": r.get::<_,Option<String>>(2)?,
        "cedula": r.get::<_,Option<i64>>(3)?,
        "caso": r.get::<_,Option<String>>(4)?,
        "estado": r.get::<_,Option<String>>(5)?,
        "planta": r.get::<_,Option<String>>(6)?,
        "materiaPrima_producto": r.get::<_,Option<String>>(7)?,
        "cliente_proveedor": r.get::<_,Option<String>>(8)?,
        "transportadora": r.get::<_,Option<String>>(9)?,
        "origen_destino": r.get::<_,Option<String>>(10)?,
        "tara": r.get::<_,Option<i64>>(11)?,
        "bruto": r.get::<_,Option<i64>>(12)?,
        "neto": r.get::<_,Option<i64>>(13)?,
        "no_tiquete": r.get::<_,Option<i64>>(14)?,
        "no_interno": r.get::<_,Option<String>>(15)?,
        "tipo_vehiculo": r.get::<_,Option<String>>(16)?,
        "operario": r.get::<_,Option<String>>(17)?,
        "nick_operario": r.get::<_,Option<String>>(18)?,
        "fecha_peso_vacio": r.get::<_,Option<String>>(19)?,
        "hora_peso_vacio": r.get::<_,Option<String>>(20)?,
        "no_sello": r.get::<_,Option<String>>(21)?,
        "no_shipment": r.get::<_,Option<String>>(22)?,
        "no_r": r.get::<_,Option<String>>(23)?,
        "no_contenedor": r.get::<_,Option<String>>(24)?,
        "observaciones": r.get::<_,Option<String>>(25)?,
        "created_at": r.get::<_,Option<String>>(26)?,
    }))
}

async fn list_transit(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Query(query_params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, AppError> {
    let search = query_params
        .get("search")
        .map(|s| format!("%{}%", s.trim().to_uppercase()));

    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let rows: Vec<Value> = if let Some(ref pattern) = search {
            let mut stmt = conn.prepare(
                "SELECT id, Placa, Conductor, Cedula, Caso, estado,
                        Planta, MateriaPrima_Producto, Cliente_Proveedor, Transportadora,
                        Origen_Destino, Tara, Bruto, Neto, No_Tiquete, No_Interno,
                        Tipo_Vehiculo, Operario, Nick_Operario, Fecha_peso_vacio,
                        Hora_peso_vacio, No_Sello, No_Shipment, No_R, No_Contenedor,
                        Observaciones, created_at
                 FROM Vehiculos_en_Transito
                 WHERE estado = 'EN_TRANSITO' AND Placa LIKE ?
                 ORDER BY created_at DESC",
            )?;
            let collected: Vec<Value> = stmt.query_map([pattern], row_to_transit_value)?
                .filter_map(|r| r.ok())
                .collect();
            collected
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, Placa, Conductor, Cedula, Caso, estado,
                        Planta, MateriaPrima_Producto, Cliente_Proveedor, Transportadora,
                        Origen_Destino, Tara, Bruto, Neto, No_Tiquete, No_Interno,
                        Tipo_Vehiculo, Operario, Nick_Operario, Fecha_peso_vacio,
                        Hora_peso_vacio, No_Sello, No_Shipment, No_R, No_Contenedor,
                        Observaciones, created_at
                 FROM Vehiculos_en_Transito
                 WHERE estado = 'EN_TRANSITO'
                 ORDER BY created_at DESC",
            )?;
            let collected: Vec<Value> = stmt.query_map([], row_to_transit_value)?
                .filter_map(|r| r.ok())
                .collect();
            collected
        };

        let total = rows.len();
        Ok(Json(json!({
            "data": rows,
            "pagination": {
                "page": 1,
                "limit": total,
                "total": total,
                "total_pages": 1
            }
        })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn get_transit(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(placa): Path<String>,
) -> Result<Json<Value>, AppError> {
    let placa = placa.to_uppercase();
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;
        let row = conn.query_row(
            "SELECT id, Placa, Conductor, Cedula, Caso, estado,
                    Planta, MateriaPrima_Producto, Cliente_Proveedor, Transportadora,
                    Origen_Destino, Tara, Bruto, Neto, No_Tiquete, No_Interno,
                    Tipo_Vehiculo, Operario, Nick_Operario, Fecha_peso_vacio,
                    Hora_peso_vacio, No_Sello, No_Shipment, No_R, No_Contenedor,
                    Observaciones, created_at
             FROM Vehiculos_en_Transito
             WHERE Placa = ? AND estado = 'EN_TRANSITO'",
            [&placa],
            row_to_transit_value,
        );
        match row {
            Ok(v) => Ok(Json(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Err(AppError::NotFound("No hay vehículo en tránsito con esa placa.".into()))
            }
            Err(e) => Err(AppError::from(e)),
        }
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn create_transit(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    user.require_permission("weighing:create_ingreso")?;

    // Frontend sends lowercase field names
    let placa = body
        .get("placa")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::BadRequest("VALIDATION_ERROR".into(), "La placa es requerida.".into())
        })?;

    let caso = body
        .get("caso")
        .and_then(|v| v.as_str())
        .filter(|&s| s == "Ingreso" || s == "Despacho")
        .ok_or_else(|| {
            AppError::BadRequest(
                "VALIDATION_ERROR".into(),
                "El campo Caso debe ser 'Ingreso' o 'Despacho'.".into(),
            )
        })?
        .to_string();

    // Ingreso: primer_peso = Bruto (vehículo llega cargado)
    // Despacho: primer_peso = Tara (vehículo llega vacío)
    let primer_peso = body.get("primer_peso").and_then(|v| v.as_i64()).unwrap_or(0);
    if primer_peso < 0 || primer_peso > 99999 {
        return Err(AppError::BadRequest(
            "VALIDATION_ERROR".into(),
            "El primer peso debe estar entre 0 y 99999 kg.".into(),
        ));
    }

    let (fecha, hora) = local_now();
    let db = state.db.clone();
    let user_nombre = format!("{} {}", user.nombre, user.apellido);
    let user_nick = user.nick.clone();

    let row = tokio::task::spawn_blocking(move || -> Result<Value, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        // check duplicate placa in transit
        let dup: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Vehiculos_en_Transito WHERE Placa = ? AND estado = 'EN_TRANSITO'",
            [&placa],
            |r| r.get(0),
        ).unwrap_or(0);
        if dup > 0 {
            return Err(AppError::Conflict(
                "VEHICLE_IN_TRANSIT".into(),
                "El vehículo ya está en proceso de pesaje.".into(),
            ));
        }

        // regla peso mínimo
        let regla_activa: String = conn
            .query_row(
                "SELECT valor FROM configuraciones WHERE parametro = 'regla_peso_minimo_activa'",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "false".into());
        if regla_activa == "true" && primer_peso == 0 {
            return Err(AppError::BadRequest(
                "VALIDATION_ERROR".into(),
                "El primer peso no puede ser cero con la regla de peso mínimo activa.".into(),
            ));
        }

        // Ingreso: primer_peso es el Bruto; Despacho: primer_peso es la Tara
        let (db_bruto, db_tara) = if caso == "Ingreso" {
            (primer_peso, 0i64)
        } else {
            (0i64, primer_peso)
        };

        // Helper to extract optional string fields (frontend uses camelCase/lowercase)
        let s = |field: &str| -> Option<String> {
            body.get(field)
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };

        conn.execute(
            "INSERT INTO Vehiculos_en_Transito
             (Placa, Conductor, Cedula, Caso, Planta, MateriaPrima_Producto,
              Cliente_Proveedor, Transportadora, Origen_Destino, Tara, Bruto, Neto,
              No_Interno, Tipo_Vehiculo, Operario, Nick_Operario,
              Fecha_peso_vacio, Hora_peso_vacio,
              No_Sello, No_Shipment, No_R, No_Contenedor, Observaciones, estado)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,'EN_TRANSITO')",
            params![
                placa,
                s("conductor"),
                body.get("cedula").and_then(|v| v.as_i64()),
                caso,
                s("planta"),
                s("materiaPrima_producto"),
                s("cliente_proveedor"),
                s("transportadora"),
                s("origen_destino"),
                db_tara,
                db_bruto,
                0i64, // Neto
                s("no_interno"),
                s("tipo_vehiculo"),
                user_nombre,
                user_nick,
                fecha,
                hora,
                s("no_sello"),
                s("no_shipment"),
                s("no_r"),
                s("no_contenedor"),
                s("observaciones"),
            ],
        )?;

        let id = conn.last_insert_rowid();
        let row = conn.query_row(
            "SELECT id, Placa, Conductor, Cedula, Caso, estado,
                    Planta, MateriaPrima_Producto, Cliente_Proveedor, Transportadora,
                    Origen_Destino, Tara, Bruto, Neto, No_Tiquete, No_Interno,
                    Tipo_Vehiculo, Operario, Nick_Operario, Fecha_peso_vacio,
                    Hora_peso_vacio, No_Sello, No_Shipment, No_R, No_Contenedor,
                    Observaciones, created_at
             FROM Vehiculos_en_Transito WHERE id = ?",
            [id],
            row_to_transit_value,
        )?;

        let empresa = build_empresa(&conn);
        let (contraparte_label, origen_destino_label) = if caso == "Ingreso" {
            ("Proveedor", "Origen")
        } else {
            ("Cliente", "Destino")
        };
        let preliminary_ticket_data = json!({
            "empresa": empresa,
            "tiquete": {
                "numero": 0,
                "codigo_visual": "PRELIMINAR",
                "tipo_operacion": caso,
                "estado": "PRELIMINAR"
            },
            "vehiculo": {
                "placa": placa,
                "tipo": s("tipo_vehiculo").unwrap_or_default(),
                "transportadora": s("transportadora").unwrap_or_default()
            },
            "conductor": {
                "nombre": s("conductor").unwrap_or_default(),
                "cedula": body.get("cedula").and_then(|v| v.as_i64())
                    .map(|c| c.to_string()).unwrap_or_default()
            },
            "mercancia": {
                "descripcion": s("materiaPrima_producto").unwrap_or_default(),
                "contraparte_label": contraparte_label,
                "contraparte": s("cliente_proveedor").unwrap_or_default(),
                "contraparte_nit": "",
                "planta": s("planta").unwrap_or_default(),
                "origen_destino_label": origen_destino_label,
                "origen_destino": s("origen_destino").unwrap_or_default()
            },
            "pesaje": {
                "bruto_kg": db_bruto,
                "tara_kg": db_tara,
                "neto_kg": 0,
                "fecha_primer_pesaje": fecha,
                "hora_primer_pesaje": hora,
                "fecha_segundo_pesaje": null,
                "hora_segundo_pesaje": null
            },
            "referencias": {
                "no_sello": s("no_sello"),
                "no_shipment": s("no_shipment"),
                "no_r": s("no_r"),
                "no_contenedor": s("no_contenedor")
            },
            "observaciones": s("observaciones").unwrap_or_default(),
            "operario": {
                "nombre": user_nombre,
                "nick": user_nick
            },
            "bascula": "",
            "generado_en": local_datetime()
        });

        let mut row_with_ticket = row;
        if let Some(obj) = row_with_ticket.as_object_mut() {
            obj.insert("preliminary_ticket_data".to_string(), preliminary_ticket_data);
        }
        Ok(row_with_ticket)
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))??;

    Ok(Json(row))
}

async fn register_salida(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(placa): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let placa = placa.to_uppercase();
    // Ingreso: segundo_peso = Tara (vehículo sale vacío)
    // Despacho: segundo_peso = Bruto (vehículo sale cargado)
    let segundo_peso = body.get("segundo_peso").and_then(|v| v.as_i64()).unwrap_or(0);
    if segundo_peso < 0 || segundo_peso > 99999 {
        return Err(AppError::BadRequest(
            "VALIDATION_ERROR".into(),
            "El segundo peso debe estar entre 0 y 99999 kg.".into(),
        ));
    }

    let (fecha_lleno, hora_lleno) = local_now();
    let completado_en = local_datetime();
    let db = state.db.clone();

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let transit = conn.query_row(
            "SELECT id, Caso, Tara, Bruto, Planta, MateriaPrima_Producto, Cliente_Proveedor,
                    Transportadora, Origen_Destino, Conductor, Cedula, Operario,
                    Nick_Operario, Fecha_peso_vacio, Hora_peso_vacio,
                    No_Sello, No_Shipment, No_R, No_Contenedor, Observaciones,
                    Tipo_Vehiculo, No_Interno
             FROM Vehiculos_en_Transito WHERE Placa = ? AND estado = 'EN_TRANSITO'",
            [&placa],
            |r| {
                Ok((
                    r.get::<_, i64>(0)?,             // id
                    r.get::<_, String>(1)?,           // Caso
                    r.get::<_, i64>(2)?,              // Tara (primer_peso de Despacho)
                    r.get::<_, i64>(3)?,              // Bruto (primer_peso de Ingreso)
                    r.get::<_, Option<String>>(4)?,   // Planta
                    r.get::<_, Option<String>>(5)?,   // MateriaPrima_Producto
                    r.get::<_, Option<String>>(6)?,   // Cliente_Proveedor
                    r.get::<_, Option<String>>(7)?,   // Transportadora
                    r.get::<_, Option<String>>(8)?,   // Origen_Destino
                    r.get::<_, Option<String>>(9)?,   // Conductor
                    r.get::<_, Option<i64>>(10)?,     // Cedula
                    r.get::<_, Option<String>>(11)?,  // Operario
                    r.get::<_, Option<String>>(12)?,  // Nick_Operario
                    r.get::<_, Option<String>>(13)?,  // Fecha_peso_vacio
                    r.get::<_, Option<String>>(14)?,  // Hora_peso_vacio
                    r.get::<_, Option<String>>(15)?,  // No_Sello
                    r.get::<_, Option<String>>(16)?,  // No_Shipment
                    r.get::<_, Option<String>>(17)?,  // No_R
                    r.get::<_, Option<String>>(18)?,  // No_Contenedor
                    r.get::<_, Option<String>>(19)?,  // Observaciones
                    r.get::<_, Option<String>>(20)?,  // Tipo_Vehiculo
                    r.get::<_, Option<String>>(21)?,  // No_Interno
                ))
            },
        );

        let transit = match transit {
            Ok(t) => t,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err(AppError::NotFound(
                    "No hay vehículo en tránsito con esa placa.".into(),
                ))
            }
            Err(e) => return Err(AppError::from(e)),
        };

        let (
            transit_id, caso, db_tara, db_bruto, planta, mercancia, cliente_prov, transportadora,
            origen_destino, conductor, cedula, operario, nick_op, fecha_vacio, hora_vacio,
            no_sello, no_shipment, no_r, no_contenedor, observaciones, _tipo_vehiculo, _no_interno,
        ) = transit;

        // Ingreso: segundo_peso es la Tara (sale vacío); el Bruto viene del primer pesaje (db_bruto)
        // Despacho: segundo_peso es el Bruto (sale cargado); la Tara viene del primer pesaje (db_tara)
        let (bruto, tara, neto) = if caso == "Ingreso" {
            let b = db_bruto;
            let t = segundo_peso;
            (b, t, b - t)
        } else {
            let b = segundo_peso;
            let t = db_tara;
            (b, t, b - t)
        };

        // regla peso salida mínimo
        let regla_sal: String = conn
            .query_row(
                "SELECT valor FROM configuraciones WHERE parametro = 'regla_peso_salida_minimo_activa'",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "false".into());
        if regla_sal == "true" && segundo_peso == 0 {
            return Err(AppError::BadRequest(
                "VALIDATION_ERROR".into(),
                "El peso de salida no puede ser cero.".into(),
            ));
        }

        // get next ticket number and insert record - all in one transaction
        let result = conn.execute("BEGIN", [])?;
        let _ = result;

        let ticket_param = if caso == "Ingreso" {
            "No_Tiquete_Ingresos"
        } else {
            "No_Tiquete_Despachos"
        };
        let no_tiquete: i64 = conn.query_row(
            "SELECT CAST(valor AS INTEGER) FROM configuraciones WHERE parametro = ?",
            [ticket_param],
            |r| r.get(0),
        ).unwrap_or(1);

        // actualizar tránsito con valores finales correctos
        conn.execute(
            "UPDATE Vehiculos_en_Transito SET estado='COMPLETADO', Bruto=?1, Tara=?2, Neto=?3,
             No_Tiquete=?4, completado_en=?5 WHERE id=?6",
            params![bruto, tara, neto, no_tiquete, completado_en, transit_id],
        )?;

        // insert into ingresos or despachos
        if caso == "Ingreso" {
            conn.execute(
                "INSERT INTO Ingresos
                 (No_Tiquete, Placa, Conductor, Cedula, Materia_Prima, Planta,
                  Proveedor, Origen, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                  Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                  Operario, Nick_Operario, No_Sello, No_Shipment, No_R, No_Contenedor,
                  Observaciones)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
                params![
                    no_tiquete, placa, conductor, cedula, mercancia, planta,
                    cliente_prov, origen_destino, transportadora,
                    fecha_vacio, hora_vacio, fecha_lleno, hora_lleno,
                    bruto, tara, neto, operario, nick_op,
                    no_sello, no_shipment, no_r, no_contenedor, observaciones,
                ],
            )?;
        } else {
            conn.execute(
                "INSERT INTO Despachos
                 (No_Tiquete, Placa, Conductor, Cedula, Producto, Planta,
                  Cliente, Destino, Transportadora, Fecha_Peso_Vacio, Hora_Peso_Vacio,
                  Fecha_Peso_Lleno, Hora_Peso_Lleno, Bruto, Tara, Neto,
                  Operario, Nick_Operario, No_Sello, No_Shipment, No_R, No_Contenedor,
                  observaciones)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
                params![
                    no_tiquete, placa, conductor, cedula, mercancia, planta,
                    cliente_prov, origen_destino, transportadora,
                    fecha_vacio, hora_vacio, fecha_lleno, hora_lleno,
                    bruto, tara, neto, operario, nick_op,
                    no_sello, no_shipment, no_r, no_contenedor, observaciones,
                ],
            )?;
        }

        // increment ticket counter
        conn.execute(
            "UPDATE configuraciones SET valor = CAST(CAST(valor AS INTEGER) + 1 AS TEXT)
             WHERE parametro = ?",
            [ticket_param],
        )?;

        conn.execute("COMMIT", [])?;

        let empresa = build_empresa(&conn);
        let (contraparte_label, origen_destino_label) = if caso == "Ingreso" {
            ("Proveedor", "Origen")
        } else {
            ("Cliente", "Destino")
        };
        let ticket_data = json!({
            "empresa": empresa,
            "tiquete": {
                "numero": no_tiquete,
                "codigo_visual": no_tiquete.to_string(),
                "tipo_operacion": caso,
                "estado": "FINAL"
            },
            "vehiculo": {
                "placa": placa,
                "tipo": "",
                "transportadora": transportadora
            },
            "conductor": {
                "nombre": conductor,
                "cedula": cedula.map(|c| c.to_string()).unwrap_or_default()
            },
            "mercancia": {
                "descripcion": mercancia,
                "contraparte_label": contraparte_label,
                "contraparte": cliente_prov,
                "contraparte_nit": "",
                "planta": planta,
                "origen_destino_label": origen_destino_label,
                "origen_destino": origen_destino
            },
            "pesaje": {
                "bruto_kg": bruto,
                "tara_kg": tara,
                "neto_kg": neto,
                "fecha_primer_pesaje": fecha_vacio,
                "hora_primer_pesaje": hora_vacio,
                "fecha_segundo_pesaje": fecha_lleno,
                "hora_segundo_pesaje": hora_lleno
            },
            "referencias": {
                "no_sello": no_sello,
                "no_shipment": no_shipment,
                "no_r": no_r,
                "no_contenedor": no_contenedor
            },
            "observaciones": observaciones.unwrap_or_default(),
            "operario": {
                "nombre": operario,
                "nick": nick_op
            },
            "bascula": "",
            "generado_en": local_datetime()
        });

        // Return camelCase fields matching SalidaResponse interface
        Ok(Json(json!({
            "no_tiquete": no_tiquete,
            "tipo_operacion": caso,
            "placa": placa,
            "conductor": conductor,
            "planta": planta,
            "bruto": bruto,
            "tara": tara,
            "neto": neto,
            "fecha_peso_vacio": fecha_vacio,
            "hora_peso_vacio": hora_vacio,
            "fecha_peso_lleno": fecha_lleno,
            "hora_peso_lleno": hora_lleno,
            "operario": operario,
            "nick_operario": nick_op,
            "ticket_data": ticket_data
        })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}

async fn cancel_transit(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(placa): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let placa = placa.to_uppercase();
    // Frontend sends motivo_cancelacion
    let motivo = body
        .get("motivo_cancelacion")
        .or_else(|| body.get("motivo"))
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let cancelado_en = local_datetime();
    let db = state.db.clone();

    tokio::task::spawn_blocking(move || -> Result<Json<Value>, AppError> {
        let conn = db.lock().map_err(|_| AppError::Internal("DB lock".into()))?;

        let changed = conn.execute(
            "UPDATE Vehiculos_en_Transito
             SET estado = 'CANCELADO', motivo_cancelacion = ?1, cancelado_en = ?2
             WHERE Placa = ?3 AND estado = 'EN_TRANSITO'",
            params![motivo, cancelado_en, placa],
        )?;

        if changed == 0 {
            return Err(AppError::NotFound(
                "No hay vehículo en tránsito con esa placa.".into(),
            ));
        }

        Ok(Json(json!({ "message": "Tránsito cancelado.", "placa": placa })))
    })
    .await
    .map_err(|_| AppError::Internal("spawn_blocking".into()))?
}
