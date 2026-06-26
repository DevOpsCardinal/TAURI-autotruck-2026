use rusqlite::{Connection, Result as SqlResult, params};
use std::path::Path;

const SCHEMA_SQL: &str = r#"
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA encoding='UTF-8';

CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL UNIQUE,
    descripcion TEXT,
    nivel       INTEGER NOT NULL DEFAULT 0,
    activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS permisos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo      TEXT    NOT NULL UNIQUE,
    modulo      TEXT    NOT NULL,
    accion      TEXT    NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cedula        TEXT    NOT NULL UNIQUE,
    nombre        TEXT    NOT NULL,
    apellido      TEXT    NOT NULL DEFAULT '',
    nick          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT    UNIQUE,
    password_hash TEXT    NOT NULL,
    rol_id        INTEGER NOT NULL REFERENCES roles(id),
    activo        INTEGER NOT NULL DEFAULT 1,
    creado_en     TEXT    NOT NULL DEFAULT (datetime('now')),
    ultimo_acceso TEXT
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

CREATE TABLE IF NOT EXISTS configuraciones (
    parametro      TEXT PRIMARY KEY NOT NULL,
    valor          TEXT NOT NULL,
    descripcion    TEXT,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash TEXT    NOT NULL UNIQUE,
    creada_en  TEXT    NOT NULL DEFAULT (datetime('now')),
    expira_en  TEXT    NOT NULL,
    activa     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token   ON sesiones(token_hash);

CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT    NOT NULL,
    ip_address TEXT,
    success    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, created_at);

CREATE TABLE IF NOT EXISTS Conductores (
    id                         INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre                     TEXT NOT NULL,
    Cedula                     INTEGER UNIQUE,
    Fecha_Vencimiento_Licencia TEXT
);

CREATE TABLE IF NOT EXISTS Plantas (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Codigo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plantas_codigo
    ON Plantas(Codigo) WHERE Codigo IS NOT NULL AND Codigo != '';

CREATE TABLE IF NOT EXISTS Proveedores (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    NIT       TEXT,
    Nombre    TEXT NOT NULL,
    Telefono  TEXT,
    Direccion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_nit
    ON Proveedores(NIT) WHERE NIT IS NOT NULL AND NIT != '';

CREATE TABLE IF NOT EXISTS Clientes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    NIT       TEXT,
    Nombre    TEXT NOT NULL,
    Telefono  TEXT,
    Direccion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_nit
    ON Clientes(NIT) WHERE NIT IS NOT NULL AND NIT != '';

CREATE TABLE IF NOT EXISTS Transportadoras (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    NIT       TEXT,
    Nombre    TEXT NOT NULL,
    Telefono  TEXT,
    Direccion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transportadoras_nit
    ON Transportadoras(NIT) WHERE NIT IS NOT NULL AND NIT != '';

CREATE TABLE IF NOT EXISTS Origenes (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Codigo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_origenes_codigo
    ON Origenes(Codigo) WHERE Codigo IS NOT NULL AND Codigo != '';

CREATE TABLE IF NOT EXISTS Destinos (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Codigo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_destinos_codigo
    ON Destinos(Codigo) WHERE Codigo IS NOT NULL AND Codigo != '';

CREATE TABLE IF NOT EXISTS Materia_Prima (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Codigo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_materia_prima_codigo
    ON Materia_Prima(Codigo) WHERE Codigo IS NOT NULL AND Codigo != '';

CREATE TABLE IF NOT EXISTS Productos (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Codigo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo
    ON Productos(Codigo) WHERE Codigo IS NOT NULL AND Codigo != '';

CREATE TABLE IF NOT EXISTS Vehiculos_en_Transito (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    Placa                 TEXT NOT NULL,
    Conductor             TEXT,
    Cedula                INTEGER,
    Caso                  TEXT CHECK(Caso IN ('Ingreso','Despacho')),
    estado                TEXT NOT NULL DEFAULT 'EN_TRANSITO',
    Planta                TEXT,
    MateriaPrima_Producto TEXT,
    Cliente_Proveedor     TEXT,
    Transportadora        TEXT,
    Origen_Destino        TEXT,
    Tara                  INTEGER DEFAULT 0,
    Bruto                 INTEGER DEFAULT 0,
    Neto                  INTEGER DEFAULT 0,
    No_Tiquete            INTEGER,
    No_Interno            TEXT,
    Tipo_Vehiculo         TEXT,
    Operario              TEXT,
    Nick_Operario         TEXT,
    Fecha_peso_vacio      TEXT,
    Hora_peso_vacio       TEXT,
    No_Sello              TEXT,
    No_Shipment           TEXT,
    No_R                  TEXT,
    No_Contenedor         TEXT,
    Observaciones         TEXT,
    motivo_cancelacion    TEXT,
    cancelado_en          TEXT,
    completado_en         TEXT,
    created_at            TEXT DEFAULT (datetime('now','localtime'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transit_placa_activa
    ON Vehiculos_en_Transito(Placa) WHERE estado = 'EN_TRANSITO';
CREATE INDEX IF NOT EXISTS idx_transit_placa      ON Vehiculos_en_Transito(Placa);
CREATE INDEX IF NOT EXISTS idx_transit_caso       ON Vehiculos_en_Transito(Caso);
CREATE INDEX IF NOT EXISTS idx_transit_estado     ON Vehiculos_en_Transito(Planta, estado);
CREATE INDEX IF NOT EXISTS idx_transit_created_at ON Vehiculos_en_Transito(created_at DESC);

CREATE TABLE IF NOT EXISTS Ingresos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    No_Tiquete         INTEGER UNIQUE,
    Placa              TEXT NOT NULL,
    Conductor          TEXT,
    Cedula             INTEGER,
    Materia_Prima      TEXT,
    Planta             TEXT,
    Proveedor          TEXT,
    Origen             TEXT,
    Transportadora     TEXT,
    Fecha_Peso_Vacio   TEXT,
    Hora_Peso_Vacio    TEXT,
    Fecha_Peso_Lleno   TEXT,
    Hora_Peso_Lleno    TEXT,
    Bruto              INTEGER DEFAULT 0,
    Tara               INTEGER DEFAULT 0,
    Neto               INTEGER DEFAULT 0,
    Operario           TEXT,
    Nick_Operario      TEXT,
    No_Sello           TEXT,
    No_Shipment        TEXT,
    No_R               TEXT,
    No_Contenedor      TEXT,
    Observaciones      TEXT,
    NIT_Proveedor      TEXT,
    NIT_Transportadora TEXT,
    Codigo_Planta      TEXT,
    Codigo_Materia     TEXT,
    created_at         TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_ingresos_placa  ON Ingresos(Placa);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha  ON Ingresos(Fecha_Peso_Lleno DESC);
CREATE INDEX IF NOT EXISTS idx_ingresos_ticket ON Ingresos(No_Tiquete);

CREATE TABLE IF NOT EXISTS Despachos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    No_Tiquete         INTEGER UNIQUE,
    Placa              TEXT NOT NULL,
    Conductor          TEXT,
    Cedula             INTEGER,
    Producto           TEXT,
    Planta             TEXT,
    Cliente            TEXT,
    Destino            TEXT,
    Transportadora     TEXT,
    Fecha_Peso_Vacio   TEXT,
    Hora_Peso_Vacio    TEXT,
    Fecha_Peso_Lleno   TEXT,
    Hora_Peso_Lleno    TEXT,
    Bruto              INTEGER DEFAULT 0,
    Tara               INTEGER DEFAULT 0,
    Neto               INTEGER DEFAULT 0,
    Operario           TEXT,
    Nick_Operario      TEXT,
    NitCliente         TEXT,
    No_Sello           TEXT,
    No_Shipment        TEXT,
    No_R               TEXT,
    No_Contenedor      TEXT,
    observaciones      TEXT,
    NIT_Transportadora TEXT,
    Codigo_Planta      TEXT,
    Codigo_Producto    TEXT,
    created_at         TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_despachos_placa  ON Despachos(Placa);
CREATE INDEX IF NOT EXISTS idx_despachos_fecha  ON Despachos(Fecha_Peso_Lleno DESC);
CREATE INDEX IF NOT EXISTS idx_despachos_ticket ON Despachos(No_Tiquete);

CREATE TABLE IF NOT EXISTS Catalogo_Nombres_Historicos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogo      TEXT NOT NULL,
    identificador TEXT NOT NULL,
    nombre        TEXT NOT NULL,
    registrado_en TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(catalogo, identificador, nombre)
);
"#;

const ROLES: &[(&str, &str, i64)] = &[
    ("operario", "Acceso operativo a pesaje y tránsito", 1),
    ("administrador", "Gestión de usuarios y configuración del sistema", 2),
    ("super_administrador", "Acceso total al sistema", 3),
];

const PERMISOS: &[(&str, &str, &str, &str)] = &[
    ("weighing:create_ingreso", "weighing", "create_ingreso", "Registrar ingreso de camión"),
    ("weighing:create_despacho", "weighing", "create_despacho", "Registrar despacho de camión"),
    ("weighing:complete", "weighing", "complete", "Completar proceso de pesaje"),
    ("reports:read_operational", "reports", "read_operational", "Consultar reportes operativos"),
    ("catalogs:read", "catalogs", "read", "Consultar catálogos"),
    ("catalogs:write", "catalogs", "write", "Crear y editar entradas de catálogos"),
    ("catalogs:delete", "catalogs", "delete", "Eliminar entradas de catálogos"),
    ("settings:read", "settings", "read", "Leer configuraciones del sistema"),
    ("settings:write", "settings", "write", "Modificar configuraciones del sistema"),
    ("settings:super", "settings", "super", "Configuraciones avanzadas reservadas"),
    ("users:read", "users", "read", "Listar y consultar usuarios"),
    ("users:create", "users", "create", "Crear nuevos usuarios"),
    ("users:edit", "users", "edit", "Editar datos de usuarios existentes"),
    ("users:toggle_status", "users", "toggle_status", "Activar y desactivar usuarios"),
    ("users:reset_password", "users", "reset_password", "Restablecer contraseñas"),
    ("users:assign_super_role", "users", "assign_super_role", "Asignar rol super_administrador"),
];

const OPERARIO_PERMS: &[&str] = &[
    "weighing:create_ingreso",
    "weighing:create_despacho",
    "weighing:complete",
    "reports:read_operational",
    "catalogs:read",
    "catalogs:write",
];

const ADMIN_PERMS: &[&str] = &[
    "weighing:create_ingreso",
    "weighing:create_despacho",
    "weighing:complete",
    "reports:read_operational",
    "catalogs:read",
    "catalogs:write",
    "catalogs:delete",
    "settings:read",
    "settings:write",
    "users:read",
    "users:create",
    "users:edit",
    "users:toggle_status",
    "users:reset_password",
];

fn seed_roles_and_permissions(conn: &Connection) -> SqlResult<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM roles", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }

    for (nombre, desc, nivel) in ROLES {
        conn.execute(
            "INSERT INTO roles (nombre, descripcion, nivel) VALUES (?1,?2,?3)",
            params![nombre, desc, nivel],
        )?;
    }

    for (codigo, modulo, accion, desc) in PERMISOS {
        conn.execute(
            "INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES (?1,?2,?3,?4)",
            params![codigo, modulo, accion, desc],
        )?;
    }

    let assign_perms = |role_name: &str, codes: &[&str]| -> SqlResult<()> {
        let role_id: i64 = conn.query_row(
            "SELECT id FROM roles WHERE nombre = ?",
            [role_name],
            |r| r.get(0),
        )?;
        for code in codes {
            if let Ok(perm_id) = conn.query_row::<i64, _, _>(
                "SELECT id FROM permisos WHERE codigo = ?",
                [code],
                |r| r.get(0),
            ) {
                conn.execute(
                    "INSERT OR IGNORE INTO roles_permisos (rol_id, permiso_id) VALUES (?1,?2)",
                    params![role_id, perm_id],
                )?;
            }
        }
        Ok(())
    };

    assign_perms("operario", OPERARIO_PERMS)?;
    assign_perms("administrador", ADMIN_PERMS)?;

    let super_id: i64 = conn.query_row(
        "SELECT id FROM roles WHERE nombre = 'super_administrador'",
        [],
        |r| r.get(0),
    )?;
    let mut stmt = conn.prepare("SELECT id FROM permisos")?;
    let perm_ids: Vec<i64> = stmt
        .query_map([], |r| r.get::<_, i64>(0))?
        .filter_map(|r| r.ok())
        .collect();
    for perm_id in perm_ids {
        conn.execute(
            "INSERT OR IGNORE INTO roles_permisos (rol_id, permiso_id) VALUES (?1,?2)",
            params![super_id, perm_id],
        )?;
    }

    Ok(())
}

fn seed_configuraciones(conn: &Connection) -> SqlResult<()> {
    let configs: &[(&str, &str, &str)] = &[
        ("No_Tiquete_Ingresos", "1", "Consecutivo de tiquetes de ingreso"),
        ("No_Tiquete_Despachos", "1", "Consecutivo de tiquetes de despacho"),
        ("Trama", "Cardinal SMA", "Nombre de la trama de comunicación por defecto"),
        ("empresa_nombre", "", "Nombre legal o comercial de la empresa"),
        ("empresa_nit", "", "NIT de la empresa"),
        ("empresa_direccion", "", "Dirección de la sede principal"),
        ("empresa_ciudad", "", "Ciudad y departamento"),
        ("empresa_telefono", "", "Teléfono de contacto"),
        ("empresa_logo_path", "", "Ruta relativa al logo"),
        ("empresa_correo", "", "Correo electrónico de contacto"),
        ("indicador1_modo", "ip", "Modo de conexión del indicador 1"),
        ("indicador1_ip", "", "Dirección IP del indicador 1"),
        ("indicador1_puerto", "9761", "Puerto TCP del indicador 1"),
        ("indicador1_timeout", "5000", "Tiempo de espera en ms del indicador 1"),
        ("indicador1_trama", "Cardinal SMA", "Trama del indicador 1"),
        ("indicador2_modo", "ip", "Modo de conexión del indicador 2"),
        ("indicador2_ip", "", "Dirección IP del indicador 2"),
        ("indicador2_puerto", "9761", "Puerto TCP del indicador 2"),
        ("indicador2_timeout", "5000", "Tiempo de espera en ms del indicador 2"),
        ("indicador2_trama", "Cardinal SMA", "Trama del indicador 2"),
        ("regla_peso_minimo_activa", "false", "Activa validación de peso mínimo"),
        ("regla_peso_salida_minimo_activa", "false", "Activa validación de peso mínimo de salida"),
    ];
    for (param, valor, desc) in configs {
        conn.execute(
            "INSERT OR IGNORE INTO configuraciones (parametro, valor, descripcion) VALUES (?1,?2,?3)",
            params![param, valor, desc],
        )?;
    }
    Ok(())
}

fn seed_users(conn: &Connection) -> SqlResult<()> {
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0))?;

    if user_count == 0 {
        let op_id: i64 = conn.query_row(
            "SELECT id FROM roles WHERE nombre = 'operario'",
            [],
            |r| r.get(0),
        )?;
        let adm_id: i64 = conn.query_row(
            "SELECT id FROM roles WHERE nombre = 'administrador'",
            [],
            |r| r.get(0),
        )?;

        let op_hash = bcrypt::hash("operario1234", 10).expect("bcrypt hash");
        conn.execute(
            "INSERT INTO usuarios (cedula,nombre,apellido,nick,password_hash,rol_id,activo)
             VALUES ('0000000001','Operario','Sistema','operario',?1,?2,1)",
            params![op_hash, op_id],
        )?;

        let adm_hash = bcrypt::hash("admin1234", 10).expect("bcrypt hash");
        conn.execute(
            "INSERT INTO usuarios (cedula,nombre,apellido,nick,password_hash,rol_id,activo)
             VALUES ('0000000002','Administrador','Sistema','admin',?1,?2,1)",
            params![adm_hash, adm_id],
        )?;

        let expiry = (chrono::Utc::now() + chrono::Duration::days(365)).to_rfc3339();
        conn.execute(
            "INSERT OR IGNORE INTO configuraciones (parametro,valor,descripcion)
             VALUES ('licencia_expira',?1,'Fecha de expiración de la licencia')",
            params![expiry],
        )?;
    }

    let super_id: i64 = conn.query_row(
        "SELECT id FROM roles WHERE nombre = 'super_administrador'",
        [],
        |r| r.get(0),
    )?;
    let has_super: i64 = conn.query_row(
        "SELECT COUNT(*) FROM usuarios WHERE rol_id = ?",
        [super_id],
        |r| r.get(0),
    )?;
    if has_super == 0 {
        let hash = bcrypt::hash("4682", 10).expect("bcrypt hash");
        conn.execute(
            "INSERT INTO usuarios (cedula,nombre,apellido,nick,password_hash,rol_id,activo)
             VALUES ('0000000003','Desarrollador','Sistema','Desarrollador',?1,?2,1)",
            params![hash, super_id],
        )?;
    }

    Ok(())
}

pub fn init_database(path: &Path) -> anyhow::Result<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    conn.execute_batch(SCHEMA_SQL)?;
    seed_roles_and_permissions(&conn)?;
    seed_configuraciones(&conn)?;
    seed_users(&conn)?;
    Ok(conn)
}
