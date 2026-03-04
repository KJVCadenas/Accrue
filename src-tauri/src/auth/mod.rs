use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use keyring::Entry;
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};
use zeroize::Zeroizing;

const KEYRING_SERVICE: &str = "com.kurtc.accrue";
const KEYRING_USER: &str = "master_key";

/// Derives a 32-byte encryption key from a password + salt using Argon2id.
pub fn derive_key(password: &str, salt_bytes: &[u8]) -> Zeroizing<Vec<u8>> {
    let mut key = Zeroizing::new(vec![0u8; 32]);
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt_bytes, key.as_mut())
        .expect("argon2 key derivation failed");
    key
}

/// Hashes a password for storage using Argon2id. Returns a PHC string.
pub fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("argon2 hashing failed")
        .to_string()
}

/// Verifies a password against a stored PHC hash. Constant-time via Argon2 verify.
pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

/// Stores the 32-byte master key in the OS keyring (Windows Credential Manager).
pub fn store_key_in_keyring(key_bytes: &[u8]) -> keyring::Result<()> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    entry.set_secret(key_bytes)
}

/// Retrieves the master key from the OS keyring.
pub fn get_key_from_keyring() -> keyring::Result<Zeroizing<Vec<u8>>> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    let secret = entry.get_secret()?;
    Ok(Zeroizing::new(secret))
}

/// Removes the master key from the OS keyring (biometric disable / data wipe).
pub fn delete_key_from_keyring() -> keyring::Result<()> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    entry.delete_credential()
}

// ---------------------------------------------------------------------------
// Rate limiter — in-memory, resets on process restart
// ---------------------------------------------------------------------------

pub struct FailedAttempts {
    pub count: u32,
    pub locked_until: Option<Instant>,
}

impl FailedAttempts {
    pub fn new() -> Self {
        Self {
            count: 0,
            locked_until: None,
        }
    }

    pub fn record_failure(&mut self) {
        self.count += 1;
        let delay = match self.count {
            5 => Duration::from_secs(30),
            6 | 7 => Duration::from_secs(60),
            8 | 9 => Duration::from_secs(300),
            n if n >= 10 => Duration::from_secs(900),
            _ => return,
        };
        self.locked_until = Some(Instant::now() + delay);
    }

    pub fn reset(&mut self) {
        self.count = 0;
        self.locked_until = None;
    }

    pub fn is_rate_limited(&self) -> bool {
        self.locked_until
            .map_or(false, |t| Instant::now() < t)
    }

    pub fn seconds_remaining(&self) -> u64 {
        self.locked_until
            .and_then(|t| t.checked_duration_since(Instant::now()))
            .map_or(0, |d| d.as_secs())
    }
}

pub type FailedAttemptsState = Mutex<FailedAttempts>;
