use tauri::State;
use crate::db::DbState;
use crate::models::{Account, AccountWithBalance};
use crate::logic::balance::compute_balance;

fn row_to_account(row: &rusqlite::Row) -> rusqlite::Result<Account> {
    Ok(Account {
        id: row.get(0)?,
        name: row.get(1)?,
        account_type: row.get(2)?,
        subtype: row.get(3)?,
        currency: row.get(4)?,
        opening_balance: row.get(5)?,
        credit_limit: row.get(6)?,
        billing_cycle_day: row.get(7)?,
        payment_due_day: row.get(8)?,
        is_active: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

#[tauri::command]
pub fn list_accounts(state: State<DbState>) -> Result<Vec<AccountWithBalance>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, subtype, currency, opening_balance, credit_limit,
             billing_cycle_day, payment_due_day, is_active, created_at, updated_at
             FROM accounts ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let accounts: Vec<Account> = stmt
        .query_map([], |row| row_to_account(row))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let result = accounts
        .iter()
        .map(|a| {
            let balance = compute_balance(&conn, a);
            AccountWithBalance {
                id: a.id,
                name: a.name.clone(),
                account_type: a.account_type.clone(),
                subtype: a.subtype.clone(),
                currency: a.currency.clone(),
                opening_balance: a.opening_balance,
                credit_limit: a.credit_limit,
                billing_cycle_day: a.billing_cycle_day,
                payment_due_day: a.payment_due_day,
                is_active: a.is_active,
                created_at: a.created_at.clone(),
                updated_at: a.updated_at.clone(),
                balance,
            }
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub fn get_account(state: State<DbState>, id: i64) -> Result<AccountWithBalance, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let account = conn
        .query_row(
            "SELECT id, name, type, subtype, currency, opening_balance, credit_limit,
             billing_cycle_day, payment_due_day, is_active, created_at, updated_at
             FROM accounts WHERE id = ?1",
            [id],
            |row| row_to_account(row),
        )
        .map_err(|e| e.to_string())?;

    let balance = compute_balance(&conn, &account);
    Ok(AccountWithBalance {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        subtype: account.subtype,
        currency: account.currency,
        opening_balance: account.opening_balance,
        credit_limit: account.credit_limit,
        billing_cycle_day: account.billing_cycle_day,
        payment_due_day: account.payment_due_day,
        is_active: account.is_active,
        created_at: account.created_at,
        updated_at: account.updated_at,
        balance,
    })
}

#[tauri::command]
pub fn create_account(
    state: State<DbState>,
    name: String,
    account_type: String,
    subtype: Option<String>,
    opening_balance: f64,
    credit_limit: Option<f64>,
    billing_cycle_day: Option<i64>,
    payment_due_day: Option<i64>,
) -> Result<AccountWithBalance, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO accounts (name, type, subtype, opening_balance, credit_limit, billing_cycle_day, payment_due_day)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![name, account_type, subtype, opening_balance, credit_limit, billing_cycle_day, payment_due_day],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let account = conn
        .query_row(
            "SELECT id, name, type, subtype, currency, opening_balance, credit_limit,
             billing_cycle_day, payment_due_day, is_active, created_at, updated_at
             FROM accounts WHERE id = ?1",
            [id],
            |row| row_to_account(row),
        )
        .map_err(|e| e.to_string())?;

    let balance = compute_balance(&conn, &account);
    Ok(AccountWithBalance {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        subtype: account.subtype,
        currency: account.currency,
        opening_balance: account.opening_balance,
        credit_limit: account.credit_limit,
        billing_cycle_day: account.billing_cycle_day,
        payment_due_day: account.payment_due_day,
        is_active: account.is_active,
        created_at: account.created_at,
        updated_at: account.updated_at,
        balance,
    })
}

#[tauri::command]
pub fn update_account(
    state: State<DbState>,
    id: i64,
    name: String,
    account_type: String,
    subtype: Option<String>,
    opening_balance: f64,
    credit_limit: Option<f64>,
    billing_cycle_day: Option<i64>,
    payment_due_day: Option<i64>,
) -> Result<AccountWithBalance, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE accounts SET name=?1, type=?2, subtype=?3, opening_balance=?4,
         credit_limit=?5, billing_cycle_day=?6, payment_due_day=?7,
         updated_at=datetime('now') WHERE id=?8",
        rusqlite::params![name, account_type, subtype, opening_balance, credit_limit, billing_cycle_day, payment_due_day, id],
    )
    .map_err(|e| e.to_string())?;

    let account = conn
        .query_row(
            "SELECT id, name, type, subtype, currency, opening_balance, credit_limit,
             billing_cycle_day, payment_due_day, is_active, created_at, updated_at
             FROM accounts WHERE id = ?1",
            [id],
            |row| row_to_account(row),
        )
        .map_err(|e| e.to_string())?;

    let balance = compute_balance(&conn, &account);
    Ok(AccountWithBalance {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        subtype: account.subtype,
        currency: account.currency,
        opening_balance: account.opening_balance,
        credit_limit: account.credit_limit,
        billing_cycle_day: account.billing_cycle_day,
        payment_due_day: account.payment_due_day,
        is_active: account.is_active,
        created_at: account.created_at,
        updated_at: account.updated_at,
        balance,
    })
}

#[tauri::command]
pub fn archive_account(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE accounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn restore_account(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE accounts SET is_active = 1, updated_at = datetime('now') WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
