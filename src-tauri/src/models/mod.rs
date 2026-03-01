use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub subtype: Option<String>,
    pub currency: String,
    pub opening_balance: f64,
    pub credit_limit: Option<f64>,
    pub billing_cycle_day: Option<i64>,
    pub payment_due_day: Option<i64>,
    pub is_active: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountWithBalance {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub subtype: Option<String>,
    pub currency: String,
    pub opening_balance: f64,
    pub credit_limit: Option<f64>,
    pub billing_cycle_day: Option<i64>,
    pub payment_due_day: Option<i64>,
    pub is_active: i64,
    pub created_at: String,
    pub updated_at: String,
    pub balance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub direction: String,
    pub icon: Option<String>,
    pub is_archived: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: i64,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub transfer_id: Option<i64>,
    #[serde(rename = "type")]
    pub tx_type: String,
    pub amount: f64,
    pub date: String,
    pub notes: Option<String>,
    pub is_recurring: i64,
    pub recurrence_frequency: Option<String>,
    pub next_due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    // Joined fields
    pub category_name: Option<String>,
    pub account_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transfer {
    pub id: i64,
    pub from_account_id: i64,
    pub to_account_id: i64,
    pub amount: f64,
    pub date: String,
    pub notes: Option<String>,
    pub transfer_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardData {
    pub net_worth: f64,
    pub monthly_income: f64,
    pub monthly_expenses: f64,
    pub accounts: Vec<AccountWithBalance>,
    pub recent_transactions: Vec<Transaction>,
    pub spending_by_category: Vec<CategorySpend>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySpend {
    pub category_id: Option<i64>,
    pub category_name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpendingBreakdown {
    pub year: i64,
    pub month: i64,
    pub total_income: f64,
    pub total_expenses: f64,
    pub categories: Vec<CategorySpend>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonthSummary {
    pub year: i64,
    pub month: i64,
    pub label: String,
    pub income: f64,
    pub expenses: f64,
    pub net: f64,
}
