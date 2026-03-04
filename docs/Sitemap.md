# Sitemap & Page Feature Specifications
## Personal Finance Tracker — Desktop Application

**Version:** 1.0  
**Last Updated:** March 2026

---

## Application Structure

```
App
├── 1. Dashboard (Home)
├── 2. Transactions
│   ├── 2.1 All Transactions
│   └── 2.2 Add / Edit Transaction (Modal or Drawer)
├── 3. Transfers
│   └── 3.1 Add / Edit Transfer (Modal)
├── 4. Accounts
│   ├── 4.1 All Accounts
│   └── 4.2 Account Detail
├── 5. Reports
│   ├── 5.1 Spending Breakdown
│   └── 5.2 Monthly Trends
└── 6. Settings
    ├── 6.1 Categories
    ├── 6.2 Accounts Management
    └── 6.3 Data & Backup
```

---

## Page Specifications

---

### 1. Dashboard (Home)

> The landing page. Gives the user an instant financial snapshot.

**Features:**

- **Net Worth Card** — Total assets (sum of all debit/cash/savings balances) minus total liabilities (sum of all credit card balances owed). Displayed prominently at the top.
- **Account Balances Widget** — A card or row per account showing: name, type icon, current balance. Credit cards show balance owed vs. credit limit with a usage progress bar.
- **Monthly Summary Bar** — Current month's total income vs. total expenses vs. net (income − expenses). Toggle to view previous month.
- **Spending by Category Chart** — Donut or horizontal bar chart of expenses this month, broken down by category. Clicking a category navigates to filtered Transactions view.
- **Recent Transactions List** — Last 10 transactions across all accounts. Each row shows: date, account, category icon, description, and signed amount (green for income, red for expense). Clicking a row opens the Edit Transaction drawer.
- **Quick Add Button** — A prominent "+" button to open the Add Transaction modal without leaving the dashboard.

---

### 2. Transactions

#### 2.1 All Transactions

> A full ledger of every income and expense entry.

**Features:**

- **Transaction Table** — Columns: Date, Account, Category, Description/Notes, Type, Amount. Amounts are color-coded (green = income, red = expense).
- **Filter Bar** — Filter by: date range (presets: this month, last month, last 3 months, custom), account (multi-select), category (multi-select), transaction type (income / expense / transfer).
- **Search** — Free-text search across notes and descriptions.
- **Sort** — Sortable by date (default: newest first) and amount.
- **Pagination or Infinite Scroll** — For large transaction histories.
- **Add Transaction Button** — Opens the Add Transaction modal.
- **Edit / Delete** — Right-click or hover actions on each row to edit or delete. Deleting a transfer leg warns the user that both legs will be removed.
- **Export CSV** — Export the currently filtered view to a `.csv` file.

#### 2.2 Add / Edit Transaction (Modal or Drawer)

> A focused form for creating or editing a single income or expense entry.

**Features:**

- **Type Toggle** — Income or Expense (large, prominent toggle at top).
- **Amount Field** — Numeric input with PHP currency symbol.
- **Date Picker** — Defaults to today.
- **Account Selector** — Dropdown of active accounts.
- **Category Selector** — Dropdown filtered by the selected type (income/expense). Includes an option to quickly add a new category inline.
- **Notes Field** — Optional free-text.
- **Recurring Toggle** — If enabled, reveals: frequency selector (daily / weekly / monthly / yearly) and next due date.
- **Save / Cancel Buttons.**
- In edit mode: **Delete Button** with confirmation.

---

### 3. Transfers

#### 3.1 Add / Edit Transfer (Modal)

> A focused form for moving money between two of the user's accounts.

**Features:**

- **Transfer Type Toggle** — Regular Transfer or Credit Card Payment. The UI adapts based on selection:
  - Regular Transfer: freely pick from and to accounts.
  - Credit Card Payment: "From" is a debit/cash account, "To" is locked to a credit card account.
- **From Account Selector** — Dropdown showing current balance beneath the selected account name.
- **To Account Selector** — Dropdown (filtered based on transfer type).
- **Amount Field.**
- **Date Picker** — Defaults to today.
- **Notes Field** — Optional.
- **Save / Cancel Buttons.**
- Transfer entries appear in the Transactions list with a special "Transfer" badge and are excluded from income/expense totals.

---

### 4. Accounts

#### 4.1 All Accounts

> An overview of every account, grouped by type.

**Features:**

- **Account Cards Grid** — Grouped sections: Cash & Debit, Credit Cards, Savings & Investments.
- **Per-Card Info:**
  - Debit / Cash / Savings: name, institution, current balance.
  - Credit Card: name, balance owed, credit limit, available credit (progress bar), next billing cycle date.
- **Add Account Button** — Opens an inline form or modal to add a new account.
- **Archive Account** — Soft-delete option. Archived accounts are hidden from active views but their transactions remain in history.

#### 4.2 Account Detail

> A deep-dive view of one account.

**Features:**

- **Account Header** — Name, type, and key figures (balance or credit info).
- **Balance Over Time Chart** — Line graph of account balance across the past 3, 6, or 12 months.
- **Transaction List** — All transactions for this account, with the same filter and sort options as the main Transactions view.
- **For Credit Cards:**
  - Billing cycle indicator (e.g., cycle day 1–28, due on day 25).
  - Outstanding balance for the current cycle.
  - "Record Payment" shortcut button → opens the Transfer modal pre-filled with this card as the destination.
- **Edit Account Button** — Opens the account settings form.

---

### 5. Reports

#### 5.1 Spending Breakdown

> Category-level analysis of spending for a selected period.

**Features:**

- **Period Selector** — Month/year picker. Defaults to current month.
- **Donut Chart** — Spending proportions by category for the selected period.
- **Category Breakdown Table** — Each row: category name, total amount spent, percentage of total, transaction count. Clickable to navigate to filtered transactions.
- **Income vs. Expense Summary** — Total income, total expenses, and net for the period.
- **Account Filter** — Option to scope the report to one or more accounts.

#### 5.2 Monthly Trends

> Month-over-month spending and income view across time.

**Features:**

- **Date Range Selector** — Choose number of months to display (3, 6, 12 months).
- **Stacked Bar or Grouped Bar Chart** — Monthly totals: income (green), expenses (red), net (blue line overlay).
- **Category Trend Table** — Each category as a row, each month as a column, showing monthly spend. Useful for spotting rising costs in specific areas.
- **Top Spending Categories** — Ranked list of highest-spend categories for the selected range.

---

### 6. Settings

#### 6.1 Categories

> Manage the list of income and expense categories.

**Features:**

- **Category List** — Separated into Income and Expense sections.
- **Add Category** — Name, direction (income/expense/both), optional icon/emoji.
- **Edit Category** — Rename or change icon.
- **Archive Category** — Soft-delete. Cannot delete categories that have associated transactions.
- **Restore Archived Category** — View and re-activate archived categories.

#### 6.2 Accounts Management

> Manage account details and initial balances.

**Features:**

- **Accounts List** — All accounts including archived ones (shown separately).
- **Edit Account** — Change name, credit limit, billing cycle, or opening balance.
- **Set Opening Balance** — Allows the user to correct the opening balance if transactions were entered retroactively.
- **Archive / Restore Account.**

#### 6.3 Data & Backup

> Tools for data safety and portability.

**Features:**

- **Export All Transactions** — Download full transaction history as a CSV file.
- **Backup Database** — Save a copy of the local SQLite database file to a user-chosen folder.
- **Restore from Backup** — Load a previously saved `.sqlite` backup file.
- **Danger Zone** — "Reset All Data" option with strong confirmation dialog (type to confirm). Wipes all transactions, accounts, and categories.
- **App Info** — Current version number, last backup date.
