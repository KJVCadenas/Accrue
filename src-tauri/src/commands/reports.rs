use tauri::State;
use crate::db::DbState;
use crate::models::{AccountWithBalance, CategorySpend, DashboardData, MonthSummary, SpendingBreakdown, Transaction};
use crate::logic::balance::compute_balance;
use crate::models::Account;

fn row_to_account(row: &rusqlite::Row) -> rusqlite::Result<Account> {
    Ok(Account {
        id: row.get(0)?,
        name: row.get(1)?,
        account_type: row.get(2)?,
        subtype: row.get(3)?,
        currency: row.get(4)?,
        opening_balance: row.get(5)?,
        credit_limit: row.get(6)?,
        billing_cycle_day: row.get(7)?,
        payment_due_day: row.get(8)?,
        is_active: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

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
pub fn get_dashboard(state: State<DbState>) -> Result<DashboardData, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Load all active accounts with balances
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, subtype, currency, opening_balance, credit_limit,
             billing_cycle_day, payment_due_day, is_active, created_at, updated_at
             FROM accounts WHERE is_active = 1 ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let accounts_raw: Vec<Account> = stmt
        .query_map([], |row| row_to_account(row))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let accounts: Vec<AccountWithBalance> = accounts_raw
        .iter()
        .map(|a| {
            let balance = compute_balance(&conn, a);
            AccountWithBalance {
                id: a.id,
                name: a.name.clone(),
                account_type: a.account_type.clone(),
                subtype: a.subtype.clone(),
                currency: a.currency.clone(),
                opening_balance: a.opening_balance,
                credit_limit: a.credit_limit,
                billing_cycle_day: a.billing_cycle_day,
                payment_due_day: a.payment_due_day,
                is_active: a.is_active,
                created_at: a.created_at.clone(),
                updated_at: a.updated_at.clone(),
                balance,
            }
        })
        .collect();

    // Net worth: sum of non-credit account balances minus credit balances
    let net_worth = accounts.iter().fold(0.0_f64, |acc, a| {
        if a.account_type == "credit" {
            acc - a.balance
        } else {
            acc + a.balance
        }
    });

    // Monthly income and expenses (current month)
    let monthly_income: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions
             WHERE type = 'income' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let monthly_expenses: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions
             WHERE type = 'expense' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    // Recent 10 transactions
    let mut txn_stmt = conn
        .prepare(
            "SELECT t.id, t.account_id, t.category_id, t.transfer_id, t.type, t.amount,
             t.date, t.notes, t.is_recurring, t.recurrence_frequency, t.next_due_date,
             t.created_at, t.updated_at, c.name, a.name
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN accounts a ON t.account_id = a.id
             ORDER BY t.date DESC, t.id DESC LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let recent_transactions: Vec<Transaction> = txn_stmt
        .query_map([], |row| row_to_transaction(row))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Spending by category (current month, expenses only)
    let mut cat_stmt = conn
        .prepare(
            "SELECT t.category_id, COALESCE(c.name, 'Uncategorized'), SUM(t.amount)
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
             GROUP BY t.category_id ORDER BY SUM(t.amount) DESC",
        )
        .map_err(|e| e.to_string())?;

    let spending_by_category: Vec<CategorySpend> = cat_stmt
        .query_map([], |row| {
            Ok(CategorySpend {
                category_id: row.get(0)?,
                category_name: row.get(1)?,
                amount: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DashboardData {
        net_worth,
        monthly_income,
        monthly_expenses,
        accounts,
        recent_transactions,
        spending_by_category,
    })
}

#[tauri::command]
pub fn get_spending_breakdown(
    state: State<DbState>,
    year: i64,
    month: i64,
) -> Result<SpendingBreakdown, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let period = format!("{:04}-{:02}", year, month);

    let total_income: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income' AND strftime('%Y-%m', date) = ?1",
            [&period],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let total_expenses: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND strftime('%Y-%m', date) = ?1",
            [&period],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let mut stmt = conn
        .prepare(
            "SELECT t.category_id, COALESCE(c.name, 'Uncategorized'), SUM(t.amount)
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ?1
             GROUP BY t.category_id ORDER BY SUM(t.amount) DESC",
        )
        .map_err(|e| e.to_string())?;

    let categories: Vec<CategorySpend> = stmt
        .query_map([&period], |row| {
            Ok(CategorySpend {
                category_id: row.get(0)?,
                category_name: row.get(1)?,
                amount: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SpendingBreakdown {
        year,
        month,
        total_income,
        total_expenses,
        categories,
    })
}

#[tauri::command]
pub fn get_monthly_trends(state: State<DbState>, months: i64) -> Result<Vec<MonthSummary>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit = months.min(24).max(1);

    let mut stmt = conn
        .prepare(
            "SELECT
               CAST(strftime('%Y', date) AS INTEGER) as year,
               CAST(strftime('%m', date) AS INTEGER) as month,
               strftime('%Y-%m', date) as label,
               COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
             FROM transactions
             GROUP BY strftime('%Y-%m', date)
             ORDER BY strftime('%Y-%m', date) DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut summaries: Vec<MonthSummary> = stmt
        .query_map([limit], |row| {
            let income: f64 = row.get(3)?;
            let expenses: f64 = row.get(4)?;
            Ok(MonthSummary {
                year: row.get(0)?,
                month: row.get(1)?,
                label: row.get(2)?,
                income,
                expenses,
                net: income - expenses,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    summaries.reverse();
    Ok(summaries)
}
