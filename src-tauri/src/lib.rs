mod db;

use crate::db::{
    init_db_pool, list_accounts, list_budgets, list_categories, list_transactions, list_transfers,
};
use tauri::{generate_handler, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let pool = tauri::async_runtime::block_on(init_db_pool(&handle))
                .map_err(|err| Box::<dyn std::error::Error>::from(err))?;

            app.manage(pool);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(generate_handler![
            greet,
            list_accounts,
            list_transactions,
            list_categories,
            list_budgets,
            list_transfers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
