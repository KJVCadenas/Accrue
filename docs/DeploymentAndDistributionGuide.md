# Deployment & Distribution Guide

This guide covers how to build, release, and distribute Accrue to users across Windows, macOS, and Linux.

---

## Overview

Accrue uses **GitHub Actions** to automatically build installers for all platforms whenever you push a version tag. The workflow:

1. You push a git tag (e.g. `v0.1.0`)
2. GitHub spins up 3 runners in parallel: Windows, macOS, Linux
3. Each runner compiles the full app natively (no cross-compilation)
4. Installers are uploaded to a **GitHub Release draft**
5. You review and publish — friends download from the Releases page

---

## Prerequisites for Local Builds

### All platforms
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js 22+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

### Windows only
- [Strawberry Perl](https://strawberryperl.com/) — required to compile SQLCipher's vendored OpenSSL
  - Install to the default path: `C:\Strawberry`
  - The `.cargo/config.toml` in this repo sets the Perl path automatically

### macOS only
- Xcode Command Line Tools: `xcode-select --install`
- OpenSSL via Homebrew: `brew install openssl@3`

### Linux only
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
  librsvg2-dev patchelf libgtk-3-dev libsoup-3.0-dev
```

---

## Local Build

```bash
pnpm install
pnpm tauri build
```

Output is in `src-tauri/target/release/bundle/`:
- **Windows**: `nsis/Accrue_x.x.x_x64-setup.exe` and `msi/Accrue_x.x.x_x64_en-US.msi`
- **macOS**: `dmg/Accrue_x.x.x_x64.dmg`
- **Linux**: `appimage/Accrue_x.x.x_amd64.AppImage` and `deb/Accrue_x.x.x_amd64.deb`

---

## GitHub Actions Release Workflow

The workflow file lives at `.github/workflows/release.yml`.

### Trigger
Push any tag starting with `v`:
```bash
git tag v0.1.0
git push origin v0.1.0
```

### What it does
- Builds on `windows-latest`, `macos-latest`, `ubuntu-22.04` in parallel
- Creates a **draft GitHub Release** with all installers attached
- You then go to GitHub → Releases → edit the draft → publish

### Workflow file contents
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-22.04, windows-latest]
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: dtolnay/rust-toolchain@stable

      # macOS: OpenSSL needed for SQLCipher vendored build
      - name: Install OpenSSL (macOS)
        if: matrix.platform == 'macos-latest'
        run: brew install openssl@3

      # Linux: system dependencies for Tauri
      - name: Install system dependencies (Linux)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
            librsvg2-dev patchelf libgtk-3-dev libsoup-3.0-dev

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Accrue ${{ github.ref_name }}'
          releaseBody: 'Download the installer for your platform below.'
          releaseDraft: true
          prerelease: false
```

---

## Releasing a New Version

### Step 1: Bump the version in 3 places
- `package.json` → `"version": "0.2.0"`
- `src-tauri/tauri.conf.json` → `"version": "0.2.0"`
- `src-tauri/Cargo.toml` → `version = "0.2.0"`

### Step 2: Commit and tag
```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to v0.2.0"
git tag v0.2.0
git push origin main --tags
```

### Step 3: Watch the build
Go to your GitHub repo → **Actions** tab → watch the `Release` workflow run.
All 3 platform builds take ~10-15 minutes (first run longer due to Rust compilation cache warming).

### Step 4: Publish
Go to **Releases** → find the draft → add release notes → click **Publish release**.

### Step 5: Share
Send friends the URL:
```
https://github.com/YOUR_USERNAME/accrue/releases/latest
```

---

## Platform-Specific Notes

### Windows
- The `.exe` NSIS installer is the recommended download (user-friendly installer wizard)
- The `.msi` is an alternative for enterprise/silent installs
- Windows Defender SmartScreen may warn on first run for unsigned apps — click "More info" → "Run anyway"

### macOS
- Accrue is **not Apple-notarized** (requires $99/yr Apple Developer account)
- Users will see "Accrue can't be opened because Apple cannot check it for malicious software"
- **Workaround**: Right-click the `.app` → **Open** → **Open** in the dialog
- This only needs to be done once per machine
- Both Intel (`x64`) and Apple Silicon (`aarch64`) builds are produced

### Linux
- AppImage is self-contained, no install needed — just `chmod +x` and run
- `.deb` works on Ubuntu/Debian: `sudo dpkg -i Accrue_x.x.x_amd64.deb`

---

## GitHub Repository Setup

For the release workflow to work, your repository must be on GitHub and the Actions workflow must be committed.

If the repo is **private**, friends can still download from Releases (GitHub allows public release downloads from private repos if you share the direct link). Alternatively, make the repo public.

The `GITHUB_TOKEN` secret used in the workflow is automatically available — no manual setup needed.

---

## Code Signing (Optional, Future)

Without code signing, users see OS security warnings. To eliminate these:

| Platform | Cost | What you need |
|----------|------|---------------|
| Windows | ~$200-400/yr | Code signing certificate (DigiCert, Sectigo) |
| macOS | $99/yr | Apple Developer Program membership |

For sharing with friends, signing is not necessary. For public distribution, it significantly improves trust.
