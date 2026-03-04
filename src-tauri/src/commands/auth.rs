use crate::auth::{self, FailedAttemptsState};
use crate::db::{
    get_db_path, load_auth_settings, migrate_plaintext_to_encrypted, open_encrypted_db,
    save_auth_settings, AuthSettings, DbState,
};
use rand::RngCore;
use tauri::{AppHandle, State};

#[derive(serde::Serialize)]
pub struct AuthStatus {
    pub is_first_run: bool,
    pub is_locked: bool,
    pub biometric_enabled: bool,
    pub rate_limited: bool,
    pub rate_limit_seconds: u64,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SecuritySettings {
    pub biometric_enabled: bool,
    pub auto_lock_minutes: u32,
}

/// Returns the current auth state. Called on app mount to decide which screen to show.
#[tauri::command]
pub fn get_auth_status(
    app: AppHandle,
    state: State<DbState>,
    failed: State<FailedAttemptsState>,
) -> AuthStatus {
    let settings = load_auth_settings(&app);
    let is_locked = state.0.lock().unwrap().is_none();
    let failed_guard = failed.lock().unwrap();
    AuthStatus {
        is_first_run: settings.is_none(),
        is_locked,
        biometric_enabled: settings.as_ref().map_or(false, |s| s.biometric_enabled),
        rate_limited: failed_guard.is_rate_limited(),
        rate_limit_seconds: failed_guard.seconds_remaining(),
    }
}

/// First-time setup: creates password hash + encryption key, migrates/creates DB.
#[tauri::command]
pub fn setup_password(
    app: AppHandle,
    state: State<DbState>,
    password: String,
) -> Result<(), String> {
    if load_auth_settings(&app).is_some() {
        return Err("Already initialized".into());
    }

    // Generate a random 16-byte KDF salt
    let mut salt_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt_bytes);
    let salt_hex = hex::encode(salt_bytes);

    // Derive 32-byte master encryption key from password + salt
    let key = auth::derive_key(&password, &salt_bytes);

    // Migrate existing plaintext DB if present, otherwise create fresh
    let db_path = get_db_path(&app);
    if db_path.exists() {
        migrate_plaintext_to_encrypted(&app, &key).map_err(|e| e.to_string())?;
    }

    // Open the (now encrypted) database
    let conn = open_encrypted_db(&app, &key).map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(conn);

    // Hash the password separately for verification (not the same as the KDF output)
    let password_hash = auth::hash_password(&password);

    let settings = AuthSettings {
        password_hash,
        salt_hex,
        biometric_enabled: false,
        auto_lock_minutes: 5,
    };
    save_auth_settings(&app, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

/// Unlocks the app using the user's password.
#[tauri::command]
pub fn unlock_with_password(
    app: AppHandle,
    state: State<DbState>,
    failed: State<FailedAttemptsState>,
    password: String,
) -> Result<(), String> {
    {
        let guard = failed.lock().unwrap();
        if guard.is_rate_limited() {
            return Err(format!(
                "Too many failed attempts. Try again in {} seconds.",
                guard.seconds_remaining()
            ));
        }
    }

    let settings = load_auth_settings(&app).ok_or("App not initialized")?;

    if !auth::verify_password(&password, &settings.password_hash) {
        failed.lock().unwrap().record_failure();
        return Err("Incorrect password".into());
    }

    failed.lock().unwrap().reset();

    let salt_bytes = hex::decode(&settings.salt_hex).map_err(|e| e.to_string())?;
    let key = auth::derive_key(&password, &salt_bytes);

    let conn = open_encrypted_db(&app, &key).map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(conn);
    Ok(())
}

/// Unlocks using the key retrieved from the OS keyring (called after biometric success on frontend).
#[tauri::command]
pub fn unlock_with_biometric(app: AppHandle, state: State<DbState>) -> Result<(), String> {
    let settings = load_auth_settings(&app).ok_or("App not initialized")?;
    if !settings.biometric_enabled {
        return Err("Biometric unlock is not enabled".into());
    }

    let key = auth::get_key_from_keyring().map_err(|e| e.to_string())?;
    let conn = open_encrypted_db(&app, &key).map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(conn);
    Ok(())
}

/// Locks the app by dropping the database connection.
#[tauri::command]
pub fn lock_app(state: State<DbState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    Ok(())
}

/// Enables biometric unlock by storing the derived key in the OS keyring.
/// Requires password verification to re-derive the key.
#[tauri::command]
pub fn enable_biometric(
    app: AppHandle,
    password: String,
) -> Result<(), String> {
    let settings = load_auth_settings(&app).ok_or("App not initialized")?;

    if !auth::verify_password(&password, &settings.password_hash) {
        return Err("Incorrect password".into());
    }

    let salt_bytes = hex::decode(&settings.salt_hex).map_err(|e| e.to_string())?;
    let key = auth::derive_key(&password, &salt_bytes);
    auth::store_key_in_keyring(&key).map_err(|e| e.to_string())?;

    let mut updated = settings;
    updated.biometric_enabled = true;
    save_auth_settings(&app, &updated).map_err(|e| e.to_string())?;
    Ok(())
}

/// Disables biometric unlock and removes the key from the OS keyring.
#[tauri::command]
pub fn disable_biometric(app: AppHandle) -> Result<(), String> {
    let _ = auth::delete_key_from_keyring(); // best-effort, ignore error if not present
    let mut settings = load_auth_settings(&app).ok_or("App not initialized")?;
    settings.biometric_enabled = false;
    save_auth_settings(&app, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

/// Changes the password: verifies old, re-derives a new key, re-encrypts the DB.
#[tauri::command]
pub fn change_password(
    app: AppHandle,
    state: State<DbState>,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    let settings = load_auth_settings(&app).ok_or("App not initialized")?;

    if !auth::verify_password(&old_password, &settings.password_hash) {
        return Err("Incorrect current password".into());
    }

    // Generate a new salt and derive a new key
    let mut new_salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut new_salt);
    let new_key = auth::derive_key(&new_password, &new_salt);

    // Re-key the encrypted database in-place with PRAGMA rekey
    {
        let guard = state.0.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database is locked")?;
        let new_key_hex = hex::encode(&*new_key);
        conn.execute_batch(&format!("PRAGMA rekey = \"x'{new_key_hex}'\";"))
            .map_err(|e| e.to_string())?;
    }

    // Update the keyring if biometric was enabled
    if settings.biometric_enabled {
        auth::store_key_in_keyring(&new_key).map_err(|e| e.to_string())?;
    }

    let new_hash = auth::hash_password(&new_password);
    let updated = AuthSettings {
        password_hash: new_hash,
        salt_hex: hex::encode(new_salt),
        biometric_enabled: settings.biometric_enabled,
        auto_lock_minutes: settings.auto_lock_minutes,
    };
    save_auth_settings(&app, &updated).map_err(|e| e.to_string())?;
    Ok(())
}

/// Returns the current security configuration for the settings page.
#[tauri::command]
pub fn get_security_settings(app: AppHandle) -> Result<SecuritySettings, String> {
    let s = load_auth_settings(&app).ok_or("App not initialized")?;
    Ok(SecuritySettings {
        biometric_enabled: s.biometric_enabled,
        auto_lock_minutes: s.auto_lock_minutes,
    })
}

/// Persists the auto-lock timeout. Called from the security settings page.
#[tauri::command]
pub fn update_security_settings(
    app: AppHandle,
    auto_lock_minutes: u32,
) -> Result<(), String> {
    let mut s = load_auth_settings(&app).ok_or("App not initialized")?;
    s.auto_lock_minutes = auto_lock_minutes;
    save_auth_settings(&app, &s).map_err(|e| e.to_string())?;
    Ok(())
}

/// Forgotten password path: wipes the encrypted DB and auth config so the user
/// can start fresh. All financial data is permanently lost.
#[tauri::command]
pub fn reset_all_data_with_wipe(
    app: AppHandle,
    state: State<DbState>,
) -> Result<(), String> {
    // Drop the connection first
    *state.0.lock().unwrap() = None;

    // Remove key from OS keyring (best-effort)
    let _ = auth::delete_key_from_keyring();

    // Delete encrypted database file
    let db_path = get_db_path(&app);
    if db_path.exists() {
        std::fs::remove_file(&db_path).map_err(|e| e.to_string())?;
    }

    // Delete auth settings so the app shows the setup wizard on next launch
    let settings_path = crate::db::get_auth_settings_path(&app);
    if settings_path.exists() {
        std::fs::remove_file(&settings_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}
