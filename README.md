# Accrue

**Local-first personal finance — encrypted, private, yours.**

Accrue is a desktop app for tracking your money without subscriptions, cloud sync, or data collection. Your finances live in an encrypted database on your machine and nowhere else.

---

## Features

- **Accounts** — Track checking, savings, credit, investment, and loan accounts
- **Transactions** — Log income and expenses with categories and notes
- **Transfers** — Move money between accounts cleanly
- **Recurring Transactions** — Auto-generate repeating income and expenses
- **Categories** — Organize spending with customizable categories
- **Reports** — Visualize spending trends and net worth over time
- **Application Lock** — Password-protected with Argon2id encryption (SQLCipher)
- **Auto-lock** — App locks automatically on idle or window blur

---

## Download

Head to the [Releases page](../../releases) and download the installer for your platform:

| Platform | File |
|----------|------|
| Windows | `Accrue_x.x.x_x64-setup.exe` |
| macOS (Apple Silicon) | `Accrue_x.x.x_aarch64.dmg` |
| macOS (Intel) | `Accrue_x.x.x_x64.dmg` |
| Linux | `Accrue_x.x.x_amd64.AppImage` |

### macOS note
Accrue is not Apple-notarized. On first launch you may see a security warning. To open it:
> Right-click the app → **Open** → **Open** (in the dialog)

You only need to do this once.

---

## Security

- All data is stored locally in a **SQLCipher-encrypted** SQLite database
- Your password is never stored — it derives the encryption key via **Argon2id**
- No network requests, no telemetry, no accounts required

---

## Build from Source

See [docs/DeploymentAndDistributionGuide.md](docs/DeploymentAndDistributionGuide.md) for full prerequisites and instructions.

**Quick start:**
```bash
# Prerequisites: Rust, Node.js 22+, pnpm
# Windows also requires: Strawberry Perl (https://strawberryperl.com)
pnpm install
pnpm tauri build
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router v7, Recharts
- **Backend**: Rust, Tauri 2
- **Database**: SQLite with SQLCipher (encrypted at rest)
- **Build**: Vite 7, pnpm
