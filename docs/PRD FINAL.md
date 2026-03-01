# Product Requirements Document (PRD)
## Personal Finance Tracker — Desktop Application

**Version:** 1.0  
**Author:** Personal  
**Status:** Draft  
**Last Updated:** March 2026

---

## 1. Overview

### 1.1 Purpose

A personal desktop application for tracking income, expenses, and transfers across multiple accounts — including cash, debit, credit cards, and savings accounts. The goal is to have a clear, real-time picture of personal financial health without relying on third-party apps or cloud services.

### 1.2 Goals

- Track all spending and income across every account in one place.
- Understand net worth at a glance — assets minus credit card liabilities.
- Categorize transactions for spending insight and trends.
- Manage credit card billing cycles and payments.
- Support savings accounts including future instruments like MP2.

### 1.3 Non-Goals (v1.0)

- Bank syncing or API integrations (manual entry only).
- Multi-user or shared household tracking.
- Investment portfolio tracking (stocks, crypto).
- Bill reminders or push notifications.
- Mobile version.

---

## 2. Users

This is a single-user personal application. There is no authentication or user management.

---

## 3. Accounts

The application must support the following account types:

| Type | Examples | Notes |
|---|---|---|
| Cash / Wallet | Wallet | Physical cash on hand |
| Debit | UnionBank Debit | Linked to a bank account |
| Credit Card | UnionBank Credit, ZED Credit | Has a credit limit and billing cycle |
| Savings | CIMB, MariBank | Parked funds, earns interest |
| Investment Savings | MP2 *(future)* | Gov't / special savings instruments |

**Account attributes:**
- Name, type, currency (default: PHP)
- Current balance (auto-computed or manually overridden)
- Active / Archived status
- For credit cards: credit limit, billing cycle start day, payment due day

---

## 4. Transactions

### 4.1 Types

| Type | Description |
|---|---|
| Income | Money received into an account (salary, interest, cashback) |
| Expense | Money spent from an account (purchases, bills, fees) |
| Transfer | Movement of funds between two of the user's own accounts |
| Credit Payment | Special transfer: paying off a credit card from debit/cash |

### 4.2 Transaction Fields

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Defaults to today |
| Account | Yes | Source account |
| Type | Yes | Income / Expense |
| Amount | Yes | Positive number |
| Category | Yes | Selected from category list |
| Notes / Description | No | Free text |
| Is Recurring | No | Flag for repeating transactions |
| Recurrence Frequency | Conditional | Daily / Weekly / Monthly / Yearly |
| Next Due Date | Conditional | When the next recurrence fires |

### 4.3 Transfers

A transfer affects **two accounts simultaneously**:
- Source account is debited (expense leg)
- Destination account is credited (income leg)
- Both legs are linked by a shared `transfer_id`
- Transfers are excluded from income/expense summaries to avoid double-counting

### 4.4 Balance Calculation Rules

- **Cash / Debit / Savings:** `opening_balance + Σ(income) − Σ(expenses)`
- **Credit Card:** `Σ(purchases) − Σ(payments)` → current amount owed. Available credit = `credit_limit − amount_owed`.
- Credit card payments reduce the amount owed but are **not** counted as expenses (the expense was already recorded at time of purchase).

---

## 5. Categories

- Predefined default categories, user-editable.
- Each category has a `direction`: Income, Expense, or Both.
- Categories cannot be deleted if transactions reference them; they can be archived.

**Default Expense Categories:** Food & Dining, Transportation, Shopping, Bills & Utilities, Health & Medical, Entertainment, Personal Care, Subscriptions, Education, Miscellaneous.

**Default Income Categories:** Salary, Freelance / Side Income, Interest Earned, Cashback & Rewards, Transfers Received, Miscellaneous Income.

---

## 6. Reporting & Insights

### 6.1 Dashboard Summary
- Net worth = sum of all positive account balances minus credit card balances owed.
- Monthly income vs. expenses (current month).
- Spending by category (current month, donut/bar chart).
- Recent transactions (last 10).

### 6.2 Transaction History
- Filterable by date range, account, category, and type.
- Sortable by date and amount.
- Searchable by notes.

### 6.3 Spending Trends
- Monthly breakdown of expenses by category (last 6–12 months).
- Month-over-month comparison.

### 6.4 Account Detail View
- Full transaction list per account.
- Balance history over time.
- For credit cards: current balance owed, available credit, billing cycle progress.

---

## 7. Technical Requirements

### 7.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop Shell | **Tauri v2** | Lightweight native wrapper; no Chromium bundled |
| Frontend Build | **Vite** | Fast HMR dev server; bundles the UI for Tauri's WebView |
| UI Framework | **React** (via Vite template) | Component-based UI |
| Backend / Core Logic | **Rust** | Tauri's backend; handles all DB access, business logic, and file I/O |
| Database | **SQLite** via `rusqlite` or `sqlx` | Embedded, local, offline-first |
| Tauri–Frontend Bridge | **Tauri Commands** (`#[tauri::command]`) | Rust functions exposed to the frontend via `invoke()` |

### 7.2 Architecture Principles

- **All database access runs in Rust.** The frontend never queries SQLite directly. It calls Tauri commands and receives typed JSON responses.
- **Business logic lives in Rust.** Balance calculations, transfer leg generation, and recurring transaction logic are handled server-side in the Rust backend — not in the frontend.
- **The frontend is display-only.** React components are responsible for rendering data and collecting user input. They delegate all state mutations to Rust via `invoke()`.
- **Offline-first.** No network calls in v1.0. All data is local to the user's machine.

### 7.3 Project Structure

```
finance-tracker/
├── src-tauri/              # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── main.rs         # Tauri app entry point
│   │   ├── commands/       # Tauri command handlers (accounts, transactions, etc.)
│   │   ├── db/             # SQLite setup, migrations, query functions
│   │   ├── models/         # Rust structs mirroring DB schema (serde-serializable)
│   │   └── logic/          # Business logic (balance calc, transfers, recurrence)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # Frontend (React + Vite)
│   ├── main.tsx            # React entry point
│   ├── pages/              # Page-level components
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom React hooks (e.g., useAccounts, useTransactions)
│   └── lib/
│       └── tauri.ts        # Typed wrappers around Tauri invoke() calls
├── index.html
└── vite.config.ts
```

### 7.4 Data Layer

- **Database:** SQLite file stored in Tauri's `appLocalDataDir` (OS-managed, per-user).
- **Migrations:** Managed in Rust at startup using embedded SQL migration files.
- **Recommended crate:** `sqlx` (async, compile-time query checking) or `rusqlite` (simpler, synchronous).

### 7.5 Data Portability

- **CSV Export:** Rust generates and writes the file; Tauri's dialog API lets the user choose the save location.
- **Database Backup:** Copy the `.sqlite` file to a user-selected directory via Tauri's `fs` and `dialog` APIs.
- **Restore from Backup:** Replace the active database file with a user-selected `.sqlite` backup, followed by an app restart.

### 7.6 Platform Support

| OS | Support |
|---|---|
| macOS | Primary |
| Windows | Supported |
| Linux | Supported |

### 7.7 General Constraints

- **Currency:** Philippine Peso (PHP) as default; single currency in v1.0.
- **No internet connection required.** All features work fully offline.
- **Bundle size goal:** Keep final installer under 10 MB (Tauri's key advantage over Electron).

---

## 8. Future Considerations (Post v1.0)

- Recurring transaction auto-generation.
- Budget limits per category with alerts.
- MP2 and investment account support with contribution tracking.
- Attach receipt images to transactions.
- Dark mode.
- Data import from bank CSV exports.
