use tauri::{AppHandle, State};
use crate::db::DbState;

#[tauri::command]
pub async fn export_transactions_csv(
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    let rows = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT t.id, a.name, c.name, t.type, t.amount, t.date, t.notes, t.is_recurring
                 FROM transactions t
                 LEFT JOIN accounts a ON t.account_id = a.id
                 LEFT JOIN categories c ON t.category_id = c.id
                 ORDER BY t.date DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows: Vec<String> = stmt
            .query_map([], |row| {
                let id: i64 = row.get(0)?;
                let account: Option<String> = row.get(1)?;
                let category: Option<String> = row.get(2)?;
                let tx_type: String = row.get(3)?;
                let amount: f64 = row.get(4)?;
                let date: String = row.get(5)?;
                let notes: Option<String> = row.get(6)?;
                let recurring: i64 = row.get(7)?;
                Ok(format!(
                    "{},{},{},{},{:.2},{},{},{}",
                    id,
                    account.unwrap_or_default(),
                    category.unwrap_or_default(),
                    tx_type,
                    amount,
                    date,
                    notes.unwrap_or_default().replace(',', ";"),
                    recurring
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };

    let header = "id,account,category,type,amount,date,notes,is_recurring".to_string();
    let mut csv_lines = vec![header];
    csv_lines.extend(rows);
    let csv = csv_lines.join("\n");

    let path = app
        .dialog()
        .file()
        .set_file_name("transactions.csv")
        .blocking_save_file();

    if let Some(file_path) = path {
        let path_str = file_path.to_string();
        std::fs::write(&path_str, csv).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn backup_database(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    use tauri::Manager;

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("accrue.sqlite");

    let dest = app
        .dialog()
        .file()
        .set_file_name("accrue_backup.sqlite")
        .blocking_save_file();

    if let Some(file_path) = dest {
        let dest_str = file_path.to_string();
        std::fs::copy(&db_path, &dest_str).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn restore_database(app: AppHandle, _state: State<'_, DbState>) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    use tauri::Manager;

    let src = app
        .dialog()
        .file()
        .blocking_pick_file();

    if let Some(file_path) = src {
        let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = data_dir.join("accrue.sqlite");
        let src_str = file_path.to_string();
        std::fs::copy(&src_str, &db_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn reset_all_data(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA foreign_keys = OFF;
         DELETE FROM transactions;
         DELETE FROM transfers;
         DELETE FROM accounts;
         DELETE FROM categories;
         PRAGMA foreign_keys = ON;",
    )
    .map_err(|e| e.to_string())?;

    // Re-seed categories
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
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
