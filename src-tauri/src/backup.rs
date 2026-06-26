use chrono::Local;
use std::path::{Path, PathBuf};

const RETENTION_DAYS: i64 = 30;

fn backup_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("backups")
}

fn today_filename() -> String {
    Local::now().format("bioplanta_%Y-%m-%d.db").to_string()
}

fn ensure_dir(dir: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)
}

/// Hace checkpoint del WAL y copia la DB al destino.
/// Abre una conexión temporal solo para el checkpoint; de esta forma el
/// archivo principal queda completamente consistente antes de copiarlo.
fn checkpoint_and_copy(db_path: &Path, dest: &Path) -> anyhow::Result<()> {
    let conn = rusqlite::Connection::open(db_path)?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    drop(conn);
    std::fs::copy(db_path, dest)?;
    Ok(())
}

/// Elimina backups con más de RETENTION_DAYS días.
fn purge_old_backups(backup_dir: &Path) {
    let cutoff = (Local::now() - chrono::Duration::days(RETENTION_DAYS)).date_naive();

    let Ok(entries) = std::fs::read_dir(backup_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("db") {
            continue;
        }
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        if let Some(date_str) = stem.strip_prefix("bioplanta_") {
            if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                if date < cutoff {
                    match std::fs::remove_file(&path) {
                        Ok(_) => eprintln!("[backup] eliminado backup antiguo: {}", path.display()),
                        Err(e) => eprintln!("[backup] no se pudo eliminar {}: {}", path.display(), e),
                    }
                }
            }
        }
    }
}

/// Llamar al **arranque**: copia la DB si el backup de hoy no existe aún.
/// Preserva el estado inicial del día antes de que se registren operaciones.
pub fn on_startup(db_path: &Path, data_dir: &Path) {
    let bdir = backup_dir(data_dir);

    if let Err(e) = ensure_dir(&bdir) {
        eprintln!("[backup] no se pudo crear carpeta de backups: {}", e);
        return;
    }

    if !db_path.exists() {
        eprintln!("[backup] primera ejecución, no hay DB que respaldar al inicio");
        return;
    }

    let dest = bdir.join(today_filename());

    if dest.exists() {
        eprintln!("[backup] backup de hoy ya existe, omitiendo backup de arranque");
    } else {
        match checkpoint_and_copy(db_path, &dest) {
            Ok(_) => eprintln!("[backup] backup de arranque creado: {}", dest.display()),
            Err(e) => eprintln!("[backup] error en backup de arranque: {}", e),
        }
    }

    purge_old_backups(&bdir);
}

/// Llamar al **cierre**: sobreescribe el backup de hoy con el estado actual.
/// Garantiza que el último backup del día refleje las operaciones registradas.
pub fn on_exit(db_path: &Path, data_dir: &Path) {
    let bdir = backup_dir(data_dir);

    if let Err(e) = ensure_dir(&bdir) {
        eprintln!("[backup] no se pudo crear carpeta de backups: {}", e);
        return;
    }

    if !db_path.exists() {
        eprintln!("[backup] DB no existe, omitiendo backup de cierre");
        return;
    }

    let dest = bdir.join(today_filename());

    match checkpoint_and_copy(db_path, &dest) {
        Ok(_) => eprintln!("[backup] backup de cierre guardado: {}", dest.display()),
        Err(e) => eprintln!("[backup] error en backup de cierre: {}", e),
    }
}
