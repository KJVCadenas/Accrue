use tauri::State;
use crate::db::DbState;
use crate::models::Transfer;

fn row_to_transfer(row: &rusqlite::Row) -> rusqlite::Result<Transfer> {
    Ok(Transfer {
        id: row.get(0)?,
        from_account_id: row.get(1)?,
        to_account_id: row.get(2)?,
        amount: row.get(3)?,
        date: row.get(4)?,
        notes: row.get(5)?,
        transfer_type: row.get(6)?,
        created_at: row.get(7)?,
    })
}

#[tauri::command]
pub fn create_transfer(
    state: State<DbState>,
    from_account_id: i64,
    to_account_id: i64,
    amount: f64,
    date: String,
    notes: Option<String>,
    transfer_type: Option<String>,
) -> Result<Transfer, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let ttype = transfer_type.unwrap_or_else(|| "regular".to_string());

    conn.execute(
        "INSERT INTO transfers (from_account_id, to_account_id, amount, date, notes, transfer_type)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![from_account_id, to_account_id, amount, date, notes, ttype],
    )
    .map_err(|e| e.to_string())?;

    let transfer_id = conn.last_insert_rowid();

    // Insert expense leg from source account
    conn.execute(
        "INSERT INTO transactions (account_id, transfer_id, type, amount, date, notes)
         VALUES (?1, ?2, 'expense', ?3, ?4, ?5)",
        rusqlite::params![from_account_id, transfer_id, amount, date, notes],
    )
    .map_err(|e| e.to_string())?;

    // Insert income leg to destination account
    conn.execute(
        "INSERT INTO transactions (account_id, transfer_id, type, amount, date, notes)
         VALUES (?1, ?2, 'income', ?3, ?4, ?5)",
        rusqlite::params![to_account_id, transfer_id, amount, date, notes],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, from_account_id, to_account_id, amount, date, notes, transfer_type, created_at
         FROM transfers WHERE id = ?1",
        [transfer_id],
        |row| row_to_transfer(row),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_transfer(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transactions WHERE transfer_id = ?1", [id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transfers WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
