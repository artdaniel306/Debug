# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run in development mode
npm run build      # Build for current platform
npm run build:win  # Build Windows NSIS installer (x64 + ia32)
npm run build:mac  # Build macOS DMG (x64 + arm64)
npm run build:linux # Build Linux AppImage + deb
npm run release    # Build and publish to GitHub Releases
```

No lint or test scripts are configured.

## Architecture

This is an Electron app with a standard main/renderer split and context isolation enforced.

**Main process** (`main.js`): Creates `BrowserWindow`, runs auto-update logic via `electron-updater`, and listens for the `install-update` IPC message from the renderer.

**Preload bridge** (`preload.js`): Runs in an isolated context with `contextIsolation: true` and `nodeIntegration: false`. Exposes `window.electronAPI` to the renderer with four event callbacks (`onUpdateAvailable`, `onUpdateDownloaded`, `onDownloadProgress`, `onUpdateError`) and one method (`installUpdate`).

**Renderer** (`renderer.js` + `index.html`): Subscribes to update events via `window.electronAPI` and manages the update notification UI. Calls `installUpdate()` on button click.

## Build & Release

- Distributor: `electron-builder`, output to `dist/`
- Auto-update provider: GitHub Releases (`owner: artdaniel306`, `repo: Debug`)
- `build/hooks/afterPack.js` runs after packaging to copy platform-specific `uv` binaries from `build/bin/` into the app's resources directory
- GitHub token for publishing is read from `GH_TOKEN` (set in `electron-builder.env`, which is git-ignored)
- Build metadata (`latest.yml`) is generated in `dist/` and consumed by `electron-updater` in installed clients
