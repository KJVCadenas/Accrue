mod commands;
mod db;
mod logic;
mod models;

use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let conn = init_db(app.handle())?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::accounts::list_accounts,
            commands::accounts::get_account,
            commands::accounts::create_account,
            commands::accounts::update_account,
            commands::accounts::archive_account,
            commands::accounts::restore_account,
            commands::transactions::list_transactions,
            commands::transactions::create_transaction,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::transfers::create_transfer,
            commands::transfers::delete_transfer,
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::archive_category,
            commands::categories::restore_category,
            commands::reports::get_dashboard,
            commands::reports::get_spending_breakdown,
            commands::reports::get_monthly_trends,
            commands::data::export_transactions_csv,
            commands::data::backup_database,
            commands::data::restore_database,
            commands::data::reset_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
