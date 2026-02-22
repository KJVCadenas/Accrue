use serde::Serialize;
use sqlx::SqlitePool;
use std::fmt;
use std::fs;
use tauri::{AppHandle, Manager, State};

#[derive(Debug)]
pub enum DbError {
    MissingAppDir,
    Io(std::io::Error),
    Sqlx(sqlx::Error),
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DbError::MissingAppDir => f.write_str("unable to resolve the Tauri app directory"),
            DbError::Io(err) => write!(f, "io error: {err}"),
            DbError::Sqlx(err) => write!(f, "sqlite error: {err}"),
        }
    }
}

impl std::error::Error for DbError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            DbError::Io(err) => Some(err),
            DbError::Sqlx(err) => Some(err),
            DbError::MissingAppDir => None,
        }
    }
}

impl From<std::io::Error> for DbError {
    fn from(err: std::io::Error) -> Self {
        DbError::Io(err)
    }
}

impl From<sqlx::Error> for DbError {
    fn from(err: sqlx::Error) -> Self {
        DbError::Sqlx(err)
    }
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AccountSummary {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TransactionSummary {
    pub id: i64,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub amount: i64,
    pub payee: Option<String>,
    pub notes: Option<String>,
    pub occurred_at: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CategorySummary {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub category_type: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BudgetSummary {
    pub id: i64,
    pub category_id: i64,
    pub month: String,
    pub target: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TransferSummary {
    pub id: i64,
    pub from_transaction_id: i64,
    pub to_transaction_id: i64,
    pub created_at: String,
}

pub async fn init_db_pool(app: &AppHandle) -> Result<SqlitePool, DbError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| DbError::MissingAppDir)?;

    fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("accrue.sqlite");
    let url = format!("sqlite://{}", db_path.display());

    let pool = SqlitePool::connect(&url).await?;

    for statement in include_str!("../sql/schema.sql").split(';') {
        let trimmed = statement.trim();
        if trimmed.is_empty() {
            continue;
        }

        sqlx::query(trimmed).execute(&pool).await?;
    }

    Ok(pool)
}

#[tauri::command]
pub async fn list_accounts(state: State<'_, SqlitePool>) -> Result<Vec<AccountSummary>, String> {
    sqlx::query_as::<_, AccountSummary>(
        r#"
SELECT id,
       name,
       type as account_type,
       created_at
FROM accounts
ORDER BY created_at DESC
"#,
    )
    .fetch_all(state.inner())
    .await
    .map_err(|err: sqlx::Error| err.to_string())
}

#[tauri::command]
pub async fn list_transactions(
    state: State<'_, SqlitePool>,
) -> Result<Vec<TransactionSummary>, String> {
    sqlx::query_as::<_, TransactionSummary>(
        r#"
SELECT id,
       account_id,
       category_id,
       amount,
       payee,
       notes,
       occurred_at,
       created_at
FROM transactions
ORDER BY occurred_at DESC
"#,
    )
    .fetch_all(state.inner())
    .await
    .map_err(|err: sqlx::Error| err.to_string())
}

#[tauri::command]
pub async fn list_categories(state: State<'_, SqlitePool>) -> Result<Vec<CategorySummary>, String> {
    sqlx::query_as::<_, CategorySummary>(
        r#"
SELECT id,
       name,
       type as category_type
FROM categories
ORDER BY name
"#,
    )
    .fetch_all(state.inner())
    .await
    .map_err(|err: sqlx::Error| err.to_string())
}

#[tauri::command]
pub async fn list_budgets(state: State<'_, SqlitePool>) -> Result<Vec<BudgetSummary>, String> {
    sqlx::query_as::<_, BudgetSummary>(
        r#"
SELECT id,
       category_id,
       month,
       target,
       created_at
FROM budgets
ORDER BY month DESC
"#,
    )
    .fetch_all(state.inner())
    .await
    .map_err(|err: sqlx::Error| err.to_string())
}

#[tauri::command]
pub async fn list_transfers(state: State<'_, SqlitePool>) -> Result<Vec<TransferSummary>, String> {
    sqlx::query_as::<_, TransferSummary>(
        r#"
SELECT id,
       from_transaction_id,
       to_transaction_id,
       created_at
FROM transfers
ORDER BY created_at DESC
"#,
    )
    .fetch_all(state.inner())
    .await
    .map_err(|err: sqlx::Error| err.to_string())
}
