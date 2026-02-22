# Repository Guidelines

This document lays out the structure, workflows, and expectations for contributing to Accrue.

## Project Structure & Module Organization
- `src/` is the React + TypeScript UI layer (`App.tsx`, `main.tsx`, `assets/`) bundled by Vite.
- `src-tauri/` houses the Rust/Tauri runtime, IPC handlers, and generated schemas (`src-tauri/src/`, `src-tauri/gen/`).
- `public/` holds static files copied into the build; `dist/` contains Vite output and should stay generated only.
- `node_modules/`, `dist/`, and Tauri artifacts are not committed; work inside the tracked `src/` and `src-tauri/` trees.

## Build, Test, and Development Commands
- `pnpm install` (or `npm install`) installs both frontend and Rust tooling.
- `pnpm tauri dev` spins up the React dev server plus the Tauri backend for live editing.
- `pnpm build` runs `tsc` followed by `vite build` to produce a production bundle before packaging.
- `pnpm tauri build` compiles the Rust backend and produces desktop binaries; run once `pnpm build` succeeds.
- `pnpm preview` serves the production bundle locally for verification before packaging.

## Coding Style & Naming Conventions
- Use TypeScript + React idioms: `PascalCase` components, `camelCase` props, hooks that start with `use`, and functional components everywhere.
- Keep money logic in integer cents only; avoid floats and rely on SQLx’s compile-time checked queries in `src-tauri/src/`.
- Indent with 2 spaces, prefer double quotes in JSX, and give exported functions explicit return types. Keep IPC payload types aligned on both sides of the bridge.

## Testing Guidelines
- There are no npm test scripts yet; add Jest/Vitest configs if frontend tests are introduced.
- Run `cargo test` from `src-tauri/` after touching Rust state, schema, or command handlers.
- Name tests after the feature (e.g., `transactions.test.ts`) and colocate them with implementation code or under `__tests__/`.

## Commit & Pull Request Guidelines
- Keep commit messages short, imperative, and descriptive (e.g., `Add monthly summary query`).
- PRs should summarize the change, list the verification steps (commands run), and link any relevant issues or mockups. Include screenshots for UI work and highlight breaking changes.

## Security & Configuration Tips
- All data stays local; never add cloud sync without explicit approval and always validate IPC inputs before touching SQLite.
- Update `src-tauri/gen/schemas/` whenever the schema changes so SQLx still type-checks at compile time.
