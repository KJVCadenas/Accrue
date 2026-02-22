# Accrue

Privacy-first desktop money tracker built with Tauri, React, Rust, and SQLite.

## Overview

A locally-first personal finance ledger designed with production-grade architecture principles.

- Cross-platform desktop app (macOS / Windows / Linux)
- Zero cloud dependencies
- Secure IPC boundary
- Compile-time validated SQL
- Money stored as integer cents for precision

Your data never leaves your machine.

## Tech Stack

- **Desktop Runtime:** Tauri
- **Frontend:** React + TypeScript
- **Backend Layer:** Rust
- **Database:** SQLite
- **Query Layer:** SQLx (compile-time checked)

## Core Features

- Multi-account tracking (cash, bank, credit, wallet)
- Income / Expense transactions
- Double-entry safe transfers
- Category-based budgeting
- Monthly summaries & reporting

## Development

### Run

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Roadmap

- Recurring transactions
- CSV import/export
- Encrypted notes
- Multi-currency support
- Analytics dashboard
- Optional cloud sync

## License

MIT
