# Copilot Instructions for Accrue

## Project Architecture

- **Frontend:** React (component-based UI, hooks) + TypeScript (static types, scalable code) in `src/`
- **Backend:** Rust (memory safety, async, error handling) in `src-tauri/src/`
- **Desktop Runtime:** Tauri (secure, cross-platform, Rust-powered) in `src-tauri/`
- **Database:** SQLite (serverless, transactional) via SQLx (async, compile-time checked, parameterized) in Rust backend
- **IPC Boundary:** All communication between frontend and backend is via Tauri's secure command IPC (see `src-tauri/src/main.rs`).

## Key Patterns & Conventions

- **Money values:** Always stored as integer cents for precision (never floats).
- **SQL:** All queries must be parameterized and compile-time validated in Rust using SQLx.
- **Data flow:** React UI dispatches actions to Tauri backend via commands; backend handles all DB operations.
- **IPC:** Use Tauri's command API for secure, type-safe communication between frontend and backend.
- **No cloud dependencies:** All data is local; do not add remote sync unless explicitly requested.
- **Security:** Never expose sensitive data or DB access directly to the frontend. Validate all IPC inputs.
- **React:** Use functional components and hooks. State management is local or via context.
- **TypeScript:** Use strict types for all props, IPC payloads, and DB models.
- **Rust:** Use idiomatic Rust patterns (ownership, error handling, async) for backend logic.
- **SQLx:** Use parameterized queries, prefer compile-time checked SQL. Avoid raw SQL strings.
- **SQLite:** Schema is defined in Rust, migrations handled via SQLx.

## Developer Workflows

- **Install:** Use `pnpm install` (preferred) or `npm install` if lockfile is missing.
- **Run:** Use `pnpm tauri dev` to start the app (dev mode, hot-reloads frontend/backend).
- **Build:** Use `pnpm tauri build` for production builds (cross-platform binaries).
- **Rust changes:** Rebuild via Tauri commands; frontend and backend hot-reload is supported.
- **Debug:** Use Tauri dev mode for live reload; Rust errors surface in terminal. TypeScript errors in browser console.
- **DB schema:** Update schema in Rust, validate with SQLx compile-time checks. See `src-tauri/gen/schemas/` for JSON schema.

## Integration Points

- **Frontend-backend:** Use Tauri commands for IPC (see `src-tauri/src/main.rs`).
- **Database:** All DB access is via Rust backend; see `src-tauri/src/lib.rs` for schema and queries.
- **Assets:** Place static files in `public/` or `src/assets/`.

## Examples

- **Transaction:** React form → Tauri command → Rust handler → SQLx query → SQLite
- **Budgeting:** Category logic in frontend, summary queries in backend
- **IPC:** Example: `invoke('addTransaction', { amount, category })` in React calls Rust handler via Tauri.
- **DB:** Example: `sqlx::query!("INSERT INTO transactions ...")` in Rust, validated at compile time.

## References

- See `ARCHITECTURE.md` for high-level design
- See `README.md` for setup and features
- See `src-tauri/gen/schemas/` for DB schema JSON
- See official docs for [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), [Rust](https://doc.rust-lang.org/book/), [Tauri](https://tauri.app), [SQLx](https://docs.rs/sqlx), [SQLite](https://sqlite.org)

## Do's and Don'ts

- **Do:** Use integer cents for money, validate all IPC inputs, keep all data local
- **Do:** Use strict types for all IPC and DB models, parameterized SQL, idiomatic Rust and React patterns
- **Don't:** Use floats for money, bypass backend for DB, add cloud sync without approval
- **Don't:** Expose DB or sensitive logic to frontend, use raw SQL strings, skip compile-time checks

---

_Last updated: 2026-02-22_
