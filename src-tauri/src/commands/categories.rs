use tauri::State;
use crate::db::DbState;
use crate::models::Category;

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get(0)?,
        name: row.get(1)?,
        direction: row.get(2)?,
        icon: row.get(3)?,
        is_archived: row.get(4)?,
        created_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn list_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, direction, icon, is_archived, created_at
             FROM categories ORDER BY direction, name",
        )
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], |row| row_to_category(row))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

#[tauri::command]
pub fn create_category(
    state: State<DbState>,
    name: String,
    direction: String,
    icon: Option<String>,
) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO categories (name, direction, icon) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, direction, icon],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, direction, icon, is_archived, created_at FROM categories WHERE id = ?1",
        [id],
        |row| row_to_category(row),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(
    state: State<DbState>,
    id: i64,
    name: String,
    direction: String,
    icon: Option<String>,
) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE categories SET name=?1, direction=?2, icon=?3 WHERE id=?4",
        rusqlite::params![name, direction, icon, id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, direction, icon, is_archived, created_at FROM categories WHERE id = ?1",
        [id],
        |row| row_to_category(row),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn archive_category(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE categories SET is_archived = 1 WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn restore_category(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE categories SET is_archived = 0 WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
