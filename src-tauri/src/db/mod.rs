use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Option<Connection>>);

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
pub struct AuthSettings {
    pub password_hash: String,
    pub salt_hex: String,
    pub biometric_enabled: bool,
    pub auto_lock_minutes: u32,
}

pub fn get_auth_settings_path(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("accrue_auth.json")
}

pub fn load_auth_settings(app: &AppHandle) -> Option<AuthSettings> {
    let path = get_auth_settings_path(app);
    let bytes = std::fs::read(&path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

pub fn save_auth_settings(app: &AppHandle, settings: &AuthSettings) -> std::io::Result<()> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&data_dir)?;
    let path = get_auth_settings_path(app);
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
    })?;
    std::fs::write(path, bytes)
}

pub fn get_db_path(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("accrue.sqlite")
}

/// Opens (or creates) the encrypted SQLite database with the given 32-byte key.
/// The PRAGMA key must be set as the very first operation on the connection.
pub fn open_encrypted_db(app: &AppHandle, key_bytes: &[u8]) -> Result<Connection> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&data_dir).expect("failed to create app data dir");
    let db_path = data_dir.join("accrue.sqlite");
    let conn = Connection::open(&db_path)?;
    let key_hex = hex::encode(key_bytes);
    conn.execute_batch(&format!("PRAGMA key = \"x'{key_hex}'\";"))?;
    run_schema(&conn)?;
    seed_categories(&conn)?;
    Ok(conn)
}

/// Migrates an existing plaintext accrue.sqlite to an encrypted copy.
/// Called once during first-time setup when legacy data exists.
pub fn migrate_plaintext_to_encrypted(app: &AppHandle, key_bytes: &[u8]) -> Result<()> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    let db_path = data_dir.join("accrue.sqlite");
    let tmp_path = data_dir.join("accrue_enc_tmp.sqlite");

    // Remove any stale temp file from a previous failed migration
    let _ = std::fs::remove_file(&tmp_path);

    // Open the plaintext database (no key = plaintext mode in SQLCipher)
    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA key = '';")?;

    // Attach and export to encrypted destination
    let key_hex = hex::encode(key_bytes);
    let tmp_str = tmp_path.to_string_lossy().replace('\\', "/");
    conn.execute_batch(&format!(
        "ATTACH DATABASE '{tmp_str}' AS encrypted KEY \"x'{key_hex}'\";\
         SELECT sqlcipher_export('encrypted');\
         DETACH DATABASE encrypted;"
    ))?;
    drop(conn);

    // Atomically replace the plaintext DB with the encrypted one
    std::fs::rename(&tmp_path, &db_path).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
            Some(e.to_string()),
        )
    })?;
    Ok(())
}

fn run_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('cash','debit','credit','savings','investment')),
          subtype TEXT,
          currency TEXT NOT NULL DEFAULT 'PHP',
          opening_balance REAL NOT NULL DEFAULT 0,
          credit_limit REAL,
          billing_cycle_day INTEGER,
          payment_due_day INTEGER,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          direction TEXT NOT NULL CHECK (direction IN ('income','expense','both')),
          icon TEXT,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transfers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_account_id INTEGER NOT NULL REFERENCES accounts(id),
          to_account_id INTEGER NOT NULL REFERENCES accounts(id),
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          transfer_type TEXT NOT NULL DEFAULT 'regular' CHECK (transfer_type IN ('regular','credit_payment')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL REFERENCES accounts(id),
          category_id INTEGER REFERENCES categories(id),
          transfer_id INTEGER REFERENCES transfers(id),
          type TEXT NOT NULL CHECK (type IN ('income','expense')),
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          is_recurring INTEGER NOT NULL DEFAULT 0,
          recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily','weekly','monthly','yearly')),
          next_due_date TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;
    Ok(())
}

fn seed_categories(conn: &Connection) -> Result<()> {
    let count: i64 =
        conn.query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let defaults = vec![
        ("Salary", "income", "💼"),
        ("Freelance", "income", "💻"),
        ("Investments", "income", "📈"),
        ("Other Income", "income", "💰"),
        ("Food & Dining", "expense", "🍽️"),
        ("Transportation", "expense", "🚗"),
        ("Shopping", "expense", "🛍️"),
        ("Utilities", "expense", "💡"),
        ("Entertainment", "expense", "🎬"),
        ("Health", "expense", "🏥"),
        ("Education", "expense", "📚"),
        ("Housing", "expense", "🏠"),
        ("Other Expense", "expense", "💸"),
    ];

    for (name, direction, icon) in defaults {
        conn.execute(
            "INSERT INTO categories (name, direction, icon) VALUES (?1, ?2, ?3)",
            (name, direction, icon),
        )?;
    }
    Ok(())
}
