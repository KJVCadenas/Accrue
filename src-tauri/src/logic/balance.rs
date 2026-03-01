use rusqlite::Connection;
use crate::models::Account;

pub fn compute_balance(conn: &Connection, account: &Account) -> f64 {
    if account.account_type == "credit" {
        // For credit: amount owed = sum(expenses) - sum(income payments)
        let expenses: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE account_id = ?1 AND type = 'expense'",
                [account.id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);
        let income: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE account_id = ?1 AND type = 'income'",
                [account.id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);
        expenses - income
    } else {
        // For cash/debit/savings/investment:
        // opening_balance + income - expenses
        let income: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE account_id = ?1 AND type = 'income'",
                [account.id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);
        let expenses: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE account_id = ?1 AND type = 'expense'",
                [account.id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);
        account.opening_balance + income - expenses
    }
}
