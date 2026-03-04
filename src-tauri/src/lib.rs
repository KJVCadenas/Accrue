mod auth;
mod commands;
mod db;
mod logic;
mod models;

use auth::{FailedAttempts, FailedAttemptsState};
use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // DB starts locked (None). Auth commands open it after verification.
            app.manage(DbState(Mutex::new(None)));
            app.manage(FailedAttemptsState::new(FailedAttempts::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::auth::get_auth_status,
            commands::auth::setup_password,
            commands::auth::unlock_with_password,
            commands::auth::unlock_with_biometric,
            commands::auth::lock_app,
            commands::auth::enable_biometric,
            commands::auth::disable_biometric,
            commands::auth::change_password,
            commands::auth::get_security_settings,
            commands::auth::update_security_settings,
            commands::auth::reset_all_data_with_wipe,
            // Account commands
            commands::accounts::list_accounts,
            commands::accounts::get_account,
            commands::accounts::create_account,
            commands::accounts::update_account,
            commands::accounts::archive_account,
            commands::accounts::restore_account,
            commands::accounts::delete_account,
            // Transaction commands
            commands::transactions::list_transactions,
            commands::transactions::create_transaction,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::transactions::process_recurring_transactions,
            // Transfer commands
            commands::transfers::create_transfer,
            commands::transfers::delete_transfer,
            commands::transfers::get_transfer,
            commands::transfers::update_transfer,
            // Category commands
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::archive_category,
            commands::categories::restore_category,
            // Report commands
            commands::reports::get_dashboard,
            commands::reports::get_spending_breakdown,
            commands::reports::get_monthly_trends,
            // Data commands
            commands::data::export_transactions_csv,
            commands::data::backup_database,
            commands::data::restore_database,
            commands::data::reset_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
