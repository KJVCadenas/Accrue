use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&data_dir).expect("failed to create app data dir");
    let db_path = data_dir.join("accrue.sqlite");
    let conn = Connection::open(db_path)?;
    run_schema(&conn)?;
    seed_categories(&conn)?;
    Ok(conn)
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
