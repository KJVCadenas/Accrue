# ARCHITECTURE.md — _Accrue_

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [IPC & Security Boundary](#ipc--security-boundary)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend / Rust Domain Layer](#backend--rust-domain-layer)
7. [Data Access & Query Layer](#data-access--query-layer)
8. [Development Guidelines](#development-guidelines)
9. [Testing Strategy](#testing-strategy)
10. [Future Extensions](#future-extensions)

## Overview

_Accrue_ is a privacy‑first, locally‑first desktop finance tracker built with:

- **Runtime:** Tauri
- **Frontend:** React + TypeScript
- **Backend:** Rust
- **Database:** SQLite with compile‑time checked SQL (SQLx)

The app enforces strong boundaries between UI and core logic via Tauri IPC and keeps all user data on‑device.

## System Architecture

```
┌──────────────────────────────┐
|        React UI (TS/JS)      |
|  — Components, Views, Hooks  |
|  — Validation & UX logic     |
└──────────────┬───────────────┘
               │ Tauri IPC Commands
               ▼
┌──────────────────────────────┐
|     Rust Backend (Core)      |
|  — Domain Logic              |
|  — Persistence Adapters      |
|  — Services & Use Cases      |
└──────────────┬───────────────┘
               │ SQLx
               ▼
┌──────────────────────────────┐
|         SQLite Database      |
|  — Tables                     |
|  — Indices, FKs, Constraints |
└──────────────────────────────┘
```

- **IPC**: Strict request/response only. No arbitrary function execution.
- **Domain Layer**: Pure Rust business logic isolated from UI.
- **Persistence**: SQLx with compile‑time validated SQL queries.

## Database Schema

All monetary values are stored as **integer cents** to guarantee precision.

### 1. Accounts

| Column     | Type     | Notes                            |
| ---------- | -------- | -------------------------------- |
| id         | INTEGER  | PK, autoincrement                |
| name       | TEXT     | e.g., “Checking”                 |
| type       | TEXT     | Enum: CASH, BANK, CREDIT, WALLET |
| created_at | DATETIME | default current_timestamp        |

### 2. Transactions

| Column      | Type     | Notes                     |
| ----------- | -------- | ------------------------- |
| id          | INTEGER  | PK                        |
| account_id  | INTEGER  | FK → Accounts             |
| amount      | INTEGER  | cents, negative = expense |
| category_id | INTEGER  | FK → Categories           |
| payee       | TEXT     | optional                  |
| notes       | TEXT     | optional                  |
| occurred_at | DATE     | event date                |
| created_at  | DATETIME | audit                     |

### 3. Transfers

| Column     | Type     | Notes             |
| ---------- | -------- | ----------------- |
| id         | INTEGER  | PK                |
| from_tx_id | INTEGER  | FK → Transactions |
| to_tx_id   | INTEGER  | FK → Transactions |
| created_at | DATETIME | audit             |

### 4. Categories

| Column | Type    | Notes             |
| ------ | ------- | ----------------- |
| id     | INTEGER | PK                |
| name   | TEXT    | e.g., “Groceries” |
| type   | TEXT    | INCOME / EXPENSE  |

### 5. Budget

| Column      | Type       | Notes           |
| ----------- | ---------- | --------------- |
| id          | INTEGER    | PK              |
| category_id | INTEGER    | FK → Categories |
| month       | YEAR‑MONTH | e.g., “2026‑02” |
| target      | INTEGER    | target cents    |
| created_at  | DATETIME   | audit           |

### Indexing & Constraints

- **Foreign Keys** enforced.
- **Unique constraints** where needed (unique account name).
- **Indices** on frequent filter columns (account_id, occurred_at).

## IPC & Security Boundary

- **Tauri Commands** are the ONLY bridge between UI and Rust.
- Avoid exposing arbitrary Rust functions to the frontend.
- Validate all IPC payloads on the Rust side — never trust the UI.
- Sanitize and transform inputs before SQL execution.

Example command:

```rust
#[tauri::command]
async fn create_transaction(payload: CreateTransaction) -> Result<TxSummary, AppError> { ... }
```

## Frontend Architecture

### Folder Structure

```
src/
 ├─ components/       # UI primitives
 ├─ features/         # Domain screens (Accounts, Transactions)
 ├─ hooks/            # Reusable logic
 ├─ services/         # IPC wrappers
 ├─ types/            # Shared TypeScript types
 └─ utils/            # formatting, validation
```

### IPC Layer

Encapsulate every Tauri command in a `services/api.ts`:

```ts
export async function fetchAccounts() {
  return invoke<Account[]>("get_accounts");
}
```

### Validation

- Form validation with Zod or equivalent.
- UI state separated from domain modeling.

## Backend / Rust Domain Layer

### Folder Layout

```
src/
 ├─ domain/          # Entities & business logic
 ├─ persistence/     # SQLx queries
 ├─ services/        # Use cases
 └─ tauri.rs         # IPC registrations
```

### Domain Rules

- Transfers must create two mirror transactions (debit/credit).
- Budget enforcement logic is isolated and testable.

---

## Data Access & Query Layer

- **SQLx** is used with offline‑checked queries.
- All SQL lives in `.sql` files or as inline queries with macros.
- Avoid ORM abstractions — explicit SQL improves clarity and correctness.

Example:

```rust
sqlx::query_as!(
    Transaction,
    r#"
    SELECT * FROM transactions
    WHERE account_id = ?
    ORDER BY occurred_at DESC
    "#,
    account_id
)
```

## Development Guidelines

### Code Quality

- Follow idiomatic Rust (Clippy + fmt).
- Strict linting for TypeScript (ESLint + Prettier).
- Prefer pure functions for logic.

### Error Handling

- Centralized error enum.
- Structured errors with context for tracing.
- UI only receives sanitized errors.

### Versioning

- Database migrations managed via a migration tool (e.g., sqlx‑cli or refinery).
- Tag releases with proper semver.

### Data Safety

- Before destructive operations, prompt user confirmation.
- Periodic backups exported to CSV.

## Testing Strategy

### Rust

- Unit tests for domain and persistence logic.
- Integration tests that run against temporary SQLite files.

### Frontend

- Component tests (Jest/RTL).
- End‑to‑end scenarios with user flows (optional).

## Future Extensions

| Feature                | Concern                       |
| ---------------------- | ----------------------------- |
| Recurring transactions | scheduler logic               |
| CSV import/export      | bidirectional data mapping    |
| Encrypted notes        | encryption at rest            |
| Multi‑currency         | new tables & conversion logic |
| Cloud sync (optional)  | end‑to‑end encryption         |
