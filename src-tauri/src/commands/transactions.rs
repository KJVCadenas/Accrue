use tauri::State;
use crate::db::DbState;
use crate::models::Transaction;

fn row_to_transaction(row: &rusqlite::Row) -> rusqlite::Result<Transaction> {
    Ok(Transaction {
        id: row.get(0)?,
        account_id: row.get(1)?,
        category_id: row.get(2)?,
        transfer_id: row.get(3)?,
        tx_type: row.get(4)?,
        amount: row.get(5)?,
        date: row.get(6)?,
        notes: row.get(7)?,
        is_recurring: row.get(8)?,
        recurrence_frequency: row.get(9)?,
        next_due_date: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        category_name: row.get(13)?,
        account_name: row.get(14)?,
    })
}

#[tauri::command]
pub fn list_transactions(
    state: State<DbState>,
    account_id: Option<i64>,
    category_id: Option<i64>,
    tx_type: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    search: Option<String>,
) -> Result<Vec<Transaction>, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "Database is locked".to_string())?;

    let mut param_idx = 0usize;
    let mut conditions = vec!["1=1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(aid) = account_id {
        param_idx += 1;
        conditions.push(format!("t.account_id = ?{}", param_idx));
        params.push(Box::new(aid));
    }
    if let Some(cid) = category_id {
        param_idx += 1;
        conditions.push(format!("t.category_id = ?{}", param_idx));
        params.push(Box::new(cid));
    }
    if let Some(ref tt) = tx_type {
        param_idx += 1;
        conditions.push(format!("t.type = ?{}", param_idx));
        params.push(Box::new(tt.clone()));
    }
    if let Some(ref df) = date_from {
        param_idx += 1;
        conditions.push(format!("t.date >= ?{}", param_idx));
        params.push(Box::new(df.clone()));
    }
    if let Some(ref dt) = date_to {
        param_idx += 1;
        conditions.push(format!("t.date <= ?{}", param_idx));
        params.push(Box::new(dt.clone()));
    }
    if let Some(ref s) = search {
        let pat = format!("%{}%", s);
        conditions.push(format!(
            "(t.notes LIKE ?{} OR c.name LIKE ?{} OR a.name LIKE ?{})",
            param_idx + 1,
            param_idx + 2,
            param_idx + 3
        ));
        param_idx += 3;
        params.push(Box::new(pat.clone()));
        params.push(Box::new(pat.clone()));
        params.push(Box::new(pat));
    }
    let _ = param_idx;

    let where_clause = conditions.join(" AND ");
    let sql = format!(
        "SELECT t.id, t.account_id, t.category_id, t.transfer_id, t.type, t.amount,
         t.date, t.notes, t.is_recurring, t.recurrence_frequency, t.next_due_date,
         t.created_at, t.updated_at, c.name, a.name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE {}
         ORDER BY t.date DESC, t.id DESC
         LIMIT 500",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let txns = stmt
        .query_map(params_refs.as_slice(), |row| row_to_transaction(row))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(txns)
}

#[tauri::command]
pub fn create_transaction(
    state: State<DbState>,
    account_id: i64,
    category_id: Option<i64>,
    tx_type: String,
    amount: f64,
    date: String,
    notes: Option<String>,
    is_recurring: bool,
    recurrence_frequency: Option<String>,
    next_due_date: Option<String>,
) -> Result<Transaction, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "Database is locked".to_string())?;
    let is_recurring_int: i64 = if is_recurring { 1 } else { 0 };
    conn.execute(
        "INSERT INTO transactions (account_id, category_id, type, amount, date, notes, is_recurring, recurrence_frequency, next_due_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![account_id, category_id, tx_type, amount, date, notes, is_recurring_int, recurrence_frequency, next_due_date],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT t.id, t.account_id, t.category_id, t.transfer_id, t.type, t.amount,
         t.date, t.notes, t.is_recurring, t.recurrence_frequency, t.next_due_date,
         t.created_at, t.updated_at, c.name, a.name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE t.id = ?1",
        [id],
        |row| row_to_transaction(row),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_transaction(
    state: State<DbState>,
    id: i64,
    account_id: i64,
    category_id: Option<i64>,
    tx_type: String,
    amount: f64,
    date: String,
    notes: Option<String>,
    is_recurring: bool,
    recurrence_frequency: Option<String>,
    next_due_date: Option<String>,
) -> Result<Transaction, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "Database is locked".to_string())?;
    let is_recurring_int: i64 = if is_recurring { 1 } else { 0 };
    conn.execute(
        "UPDATE transactions SET account_id=?1, category_id=?2, type=?3, amount=?4,
         date=?5, notes=?6, is_recurring=?7, recurrence_frequency=?8, next_due_date=?9,
         updated_at=datetime('now') WHERE id=?10",
        rusqlite::params![account_id, category_id, tx_type, amount, date, notes, is_recurring_int, recurrence_frequency, next_due_date, id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT t.id, t.account_id, t.category_id, t.transfer_id, t.type, t.amount,
         t.date, t.notes, t.is_recurring, t.recurrence_frequency, t.next_due_date,
         t.created_at, t.updated_at, c.name, a.name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE t.id = ?1",
        [id],
        |row| row_to_transaction(row),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_transaction(state: State<DbState>, id: i64) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "Database is locked".to_string())?;

    // Check if linked to a transfer
    let transfer_id: Option<i64> = conn
        .query_row(
            "SELECT transfer_id FROM transactions WHERE id = ?1",
            [id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(tid) = transfer_id {
        // Delete all transaction legs of this transfer
        conn.execute(
            "DELETE FROM transactions WHERE transfer_id = ?1",
            [tid],
        )
        .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM transfers WHERE id = ?1", [tid])
            .map_err(|e| e.to_string())?;
    } else {
        conn.execute("DELETE FROM transactions WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn process_recurring_transactions(state: State<DbState>) -> Result<i32, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or_else(|| "Database is locked".to_string())?;

    let today: String = conn
        .query_row("SELECT DATE('now')", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let due: Vec<Transaction> = {
        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.account_id, t.category_id, t.transfer_id, t.type, t.amount,
                 t.date, t.notes, t.is_recurring, t.recurrence_frequency, t.next_due_date,
                 t.created_at, t.updated_at, c.name, a.name
                 FROM transactions t
                 LEFT JOIN categories c ON t.category_id = c.id
                 LEFT JOIN accounts a ON t.account_id = a.id
                 WHERE t.is_recurring = 1 AND t.next_due_date IS NOT NULL AND t.next_due_date <= ?1",
            )
            .map_err(|e| e.to_string())?;
        let x: Vec<Transaction> = stmt
            .query_map([today.as_str()], |row| row_to_transaction(row))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        x
    };

    let mut count = 0i32;
    for t in due {
        let mut next_date = t.next_due_date.clone().unwrap();
        let freq = t.recurrence_frequency.as_deref().unwrap_or("monthly");

        while next_date <= today {
            conn.execute(
                "INSERT INTO transactions (account_id, category_id, type, amount, date, notes, is_recurring)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
                rusqlite::params![t.account_id, t.category_id, t.tx_type, t.amount, next_date, t.notes],
            )
            .map_err(|e| e.to_string())?;

            let delta = match freq {
                "daily" => "+1 day",
                "weekly" => "+7 days",
                "yearly" => "+1 year",
                _ => "+1 month",
            };
            next_date = conn
                .query_row(
                    "SELECT DATE(?1, ?2)",
                    rusqlite::params![next_date, delta],
                    |row| row.get::<_, String>(0),
                )
                .map_err(|e| e.to_string())?;

            count += 1;
        }

        conn.execute(
            "UPDATE transactions SET next_due_date = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![next_date, t.id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(count)
}
