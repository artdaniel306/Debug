# Electron Desktop App 打包與自動更新教學手冊

> 涵蓋範圍：從零建立 Electron 專案 → electron-builder 打包 → electron-updater 自動更新 → 安裝與發布

---

## 目錄

1. [環境需求](#1-環境需求)
2. [建立 Electron 專案](#2-建立-electron-專案)
3. [專案結構說明](#3-專案結構說明)
4. [安裝 electron-builder](#4-安裝-electron-builder)
5. [設定 electron-builder](#5-設定-electron-builder)
6. [打包應用程式](#6-打包應用程式)
7. [實作 electron-updater 自動更新](#7-實作-electron-updater-自動更新)
8. [設定更新伺服器](#8-設定更新伺服器)
9. [Code Signing（程式碼簽署）](#9-code-signing程式碼簽署)
10. [完整發布流程](#10-完整發布流程)
11. [常見問題排查](#11-常見問題排查)

---

## 1. 環境需求

在開始之前，請確認本機已安裝以下工具：

| 工具 | 最低版本 | 說明 |
|------|----------|------|
| Node.js | 18.x 以上 | 建議使用 LTS 版本 |
| npm / yarn | npm 9+ / yarn 1.22+ | 套件管理工具 |
| Git | 任意版本 | 版本控制 |
| Windows 打包 | Wine（Linux/macOS 上需要） | 跨平台打包 Windows 安裝檔 |

**確認 Node.js 版本：**

```bash
node -v
npm -v
```

---

## 2. 建立 Electron 專案

### 2.1 初始化專案

```bash
mkdir my-electron-app
cd my-electron-app
npm init -y
```

### 2.2 安裝 Electron

```bash
npm install --save-dev electron
```

### 2.3 建立主程序 `main.js`

```js
// main.js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

### 2.4 建立 Preload Script `preload.js`

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) =>
    ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
  installUpdate: () => ipcRenderer.send('install-update'),
})
```

### 2.5 建立前端頁面 `index.html`

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Electron App</title>
  </head>
  <body>
    <h1>Hello, Electron!</h1>
    <div id="update-notification" style="display:none;">
      <p id="update-message"></p>
      <button id="install-btn">立即安裝更新</button>
    </div>
    <script src="renderer.js"></script>
  </body>
</html>
```

### 2.6 建立 Renderer Script `renderer.js`

```js
// renderer.js
window.electronAPI.onUpdateAvailable((info) => {
  document.getElementById('update-notification').style.display = 'block'
  document.getElementById('update-message').textContent =
    `發現新版本 v${info.version}，正在下載中...`
})

window.electronAPI.onUpdateDownloaded((info) => {
  document.getElementById('update-message').textContent =
    `v${info.version} 已下載完成，點擊按鈕重啟以套用更新。`
  document.getElementById('install-btn').style.display = 'inline-block'
})

document.getElementById('install-btn')?.addEventListener('click', () => {
  window.electronAPI.installUpdate()
})
```

### 2.7 設定 `package.json` 的啟動腳本

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  }
}
```

### 2.8 測試啟動

```bash
npm start
```

視窗正常出現即代表基礎設置完成。

---

## 3. 專案結構說明

完成後的目錄結構如下：

```
my-electron-app/
├── main.js              # 主程序（Node.js 環境）
├── preload.js           # 橋接主程序與渲染程序的安全層
├── renderer.js          # 渲染程序（瀏覽器環境）
├── index.html           # 應用程式 UI
├── package.json
└── dist/                # 打包後的輸出目錄（自動產生）
```

---

## 4. 安裝 electron-builder

```bash
npm install --save-dev electron-builder
npm install electron-updater
```

> **注意：** `electron-updater` 是 **runtime dependency**，需安裝在 `dependencies` 而非 `devDependencies`。

---

## 5. 設定 electron-builder

### 5.1 在 `package.json` 中加入 build 設定

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "My first Electron desktop application",
  "main": "main.js",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder -mwl",
    "release": "electron-builder --publish always"
  },
  "build": {
    "appId": "com.yourcompany.my-electron-app",
    "productName": "My Electron App",
    "copyright": "Copyright © 2025 Your Name",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "node_modules/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns",
      "category": "public.app-category.utilities"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "build/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "My Electron App"
    },
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "your-repo-name"
    }
  }
}
```

### 5.2 準備圖示資源

在專案根目錄建立 `build/` 資料夾，放入以下圖示：

```
build/
├── icon.ico      # Windows 圖示（256x256 以上）
├── icon.icns     # macOS 圖示
└── icon.png      # Linux 圖示（512x512 建議）
```

> **提示：** 可使用 [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) 從一張 PNG 自動產生所有格式：
>
> ```bash
> npx electron-icon-builder --input=icon-source.png --output=build
> ```

---

## 6. 打包應用程式

### 6.1 打包目前平台

```bash
npm run build
```

### 6.2 指定平台打包

```bash
# 打包 Windows
npm run build:win

# 打包 macOS
npm run build:mac

# 打包 Linux
npm run build:linux
```

### 6.3 打包產出說明

執行完成後，`dist/` 目錄會包含：

| 平台 | 產出檔案 | 說明 |
|------|----------|------|
| Windows | `*.exe`（NSIS 安裝程式） | 可直接提供使用者安裝 |
| Windows | `*.exe`（portable） | 免安裝版本 |
| macOS | `*.dmg` | 拖曳安裝的磁碟映像 |
| Linux | `*.AppImage` | 免安裝，單一執行檔 |
| Linux | `*.deb` | Debian/Ubuntu 套件 |
| 通用 | `latest.yml` / `latest-mac.yml` | 更新元資料（updater 使用） |

---

## 7. 實作 electron-updater 自動更新

### 7.1 修改 `main.js` 加入更新邏輯

```js
// main.js
const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const log = require('electron-log') // 建議安裝 electron-log 方便除錯

// ─── 更新器設定 ────────────────────────────────────────────────
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
autoUpdater.autoDownload = true          // 發現新版本後自動下載
autoUpdater.autoInstallOnAppQuit = true  // 關閉 app 時自動安裝

let mainWindow

// ─── 建立視窗 ──────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile('index.html')

  // 視窗載入完成後開始檢查更新
  mainWindow.webContents.on('did-finish-load', () => {
    checkForUpdates()
  })
}

// ─── 更新檢查流程 ──────────────────────────────────────────────
function checkForUpdates() {
  // 開發模式下不執行更新（可選）
  if (!app.isPackaged) {
    log.info('開發模式，跳過更新檢查')
    return
  }

  autoUpdater.checkForUpdates()
}

// ─── autoUpdater 事件監聽 ─────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  log.info('檢查更新中...')
})

autoUpdater.on('update-available', (info) => {
  log.info(`發現新版本：${info.version}`)
  mainWindow?.webContents.send('update-available', info)
})

autoUpdater.on('update-not-available', (info) => {
  log.info(`目前已是最新版本：${info.version}`)
})

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`下載進度：${Math.round(progressObj.percent)}%`)
  mainWindow?.webContents.send('download-progress', progressObj)
})

autoUpdater.on('update-downloaded', (info) => {
  log.info(`更新下載完成：${info.version}`)
  mainWindow?.webContents.send('update-downloaded', info)
})

autoUpdater.on('error', (err) => {
  log.error(`更新錯誤：${err.message}`)
  mainWindow?.webContents.send('update-error', err.message)
})

// ─── IPC 事件：接收 renderer 的手動安裝指令 ───────────────────
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

// ─── App 生命週期 ──────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

安裝 `electron-log`（非必要但強烈建議）：

```bash
npm install electron-log
```

### 7.2 更新 `preload.js`（加入下載進度橋接）

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable:  (cb) => ipcRenderer.on('update-available',  (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, info) => cb(info)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, prog) => cb(prog)),
  onUpdateError:      (cb) => ipcRenderer.on('update-error',      (_e, msg)  => cb(msg)),
  installUpdate: () => ipcRenderer.send('install-update'),
})
```

### 7.3 更新 `renderer.js`（完整 UI 互動）

```js
// renderer.js

// 發現新版本
window.electronAPI.onUpdateAvailable((info) => {
  showNotification(`發現新版本 v${info.version}，開始下載...`)
})

// 下載進度
window.electronAPI.onDownloadProgress((progress) => {
  const percent = Math.round(progress.percent)
  showNotification(`下載中：${percent}%`)
})

// 下載完成
window.electronAPI.onUpdateDownloaded((info) => {
  showNotification(`v${info.version} 下載完成`)
  document.getElementById('install-btn').style.display = 'inline-block'
})

// 更新錯誤
window.electronAPI.onUpdateError((msg) => {
  showNotification(`更新失敗：${msg}`, 'error')
})

// 安裝按鈕
document.getElementById('install-btn')?.addEventListener('click', () => {
  window.electronAPI.installUpdate()
})

function showNotification(message, type = 'info') {
  const el = document.getElementById('update-notification')
  const msgEl = document.getElementById('update-message')
  if (el && msgEl) {
    el.style.display = 'block'
    el.style.borderColor = type === 'error' ? 'red' : '#4CAF50'
    msgEl.textContent = message
  }
}
```

### 7.4 electron-updater 更新流程圖

```
App 啟動
    │
    ▼
autoUpdater.checkForUpdates()
    │
    ├─ [無更新] → update-not-available → 結束
    │
    └─ [有更新] → update-available
                      │
                      ▼
               自動下載（autoDownload: true）
                      │
                      ▼
               download-progress（持續回報）
                      │
                      ▼
               update-downloaded
                      │
                      ├─ 使用者點擊「安裝」→ quitAndInstall()
                      │
                      └─ 關閉 App（autoInstallOnAppQuit: true）
                              │
                              ▼
                         自動安裝並重啟
```

---

## 8. 設定更新伺服器

electron-updater 支援多種更新伺服器，以下介紹最常用的兩種。

### 8.1 方案一：GitHub Releases（推薦）

最簡單的方式，適合開源或私有 GitHub 專案。

**步驟一：設定 GitHub Token**

```bash
# 設定環境變數（本機打包用）
export GH_TOKEN=your_github_personal_access_token
```

Token 需要 `repo` 權限（[產生 Token](https://github.com/settings/tokens)）。

**步驟二：`package.json` publish 設定**

```json
"publish": {
  "provider": "github",
  "owner": "your-github-username",
  "repo": "your-repo-name",
  "private": false
}
```

**步驟三：打包並發布**

```bash
GH_TOKEN=your_token npm run release
```

這會自動建立 GitHub Release 並上傳安裝檔與 `latest.yml`。

---

### 8.2 方案二：自架更新伺服器（Generic HTTP Server）

適合企業內網或不使用 GitHub 的情境。

**`package.json` 設定：**

```json
"publish": {
  "provider": "generic",
  "url": "https://your-update-server.com/releases/"
}
```

**伺服器目錄結構：**

```
releases/
├── latest.yml              # Windows 更新元資料
├── latest-mac.yml          # macOS 更新元資料
├── latest-linux.yml        # Linux 更新元資料
├── my-electron-app-1.1.0-setup.exe
├── my-electron-app-1.1.0.dmg
└── my-electron-app-1.1.0.AppImage
```

`latest.yml` 範例：

```yaml
version: 1.1.0
files:
  - url: my-electron-app-1.1.0-setup.exe
    sha512: <檔案的 SHA512 hash>
    size: 65432100
path: my-electron-app-1.1.0-setup.exe
sha512: <檔案的 SHA512 hash>
releaseDate: '2025-01-15T10:00:00.000Z'
```

> electron-builder 打包時會自動產生 `latest.yml`，只需將整個 `dist/` 目錄上傳至伺服器即可。

---

## 9. Code Signing（程式碼簽署）

### 9.1 為什麼需要簽署？

未簽署的應用程式在 Windows 上會顯示 SmartScreen 警告，在 macOS 上則無法執行（Gatekeeper 阻擋）。

### 9.2 Windows 簽署

需要一個 `.pfx` 憑證檔案：

```json
"win": {
  "certificateFile": "cert.pfx",
  "certificatePassword": "your-password"
}
```

或透過環境變數：

```bash
export CSC_LINK=path/to/cert.pfx
export CSC_KEY_PASSWORD=your-password
```

### 9.3 macOS 簽署與公證（Notarization）

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist",
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

`build/entitlements.mac.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
  </dict>
</plist>
```

---

## 10. 完整發布流程

### 10.1 版本管理

每次發布前更新版本號（遵循 [Semantic Versioning](https://semver.org/)）：

```bash
# 修補版本 1.0.0 → 1.0.1
npm version patch

# 次要版本 1.0.0 → 1.1.0
npm version minor

# 主要版本 1.0.0 → 2.0.0
npm version major
```

### 10.2 完整發布 Checklist

```
□ 1. 確認程式碼已 commit 並 push
□ 2. 執行 npm version patch/minor/major（更新版本號）
□ 3. 設定環境變數（GH_TOKEN、CSC_LINK 等）
□ 4. 執行 npm run release
□ 5. 確認 GitHub Releases 頁面有新版本
□ 6. 確認 latest.yml 已正確上傳
□ 7. 用舊版 App 測試自動更新是否正常觸發
```

### 10.3 CI/CD 整合（GitHub Actions 範例）

建立 `.github/workflows/release.yml`：

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and Publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
        run: npm run release
```

觸發發布只需：

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## 11. 常見問題排查

### Q1：打包後找不到 `node_modules`

確認 `package.json` 的 `files` 設定有包含必要的模組，或改用 `extraFiles`：

```json
"extraFiles": [
  {
    "from": "resources/",
    "to": "resources/"
  }
]
```

---

### Q2：`update-not-available` 但版本確實較舊

原因通常是 `latest.yml` 的 `version` 欄位沒有更新，或 App 在開發模式（未打包）下執行。確認：

1. `app.isPackaged` 是否為 `true`
2. 更新伺服器上的 `latest.yml` 版本號是否正確

---

### Q3：macOS 更新失敗（EPERM / 權限錯誤）

需啟用 `hardenedRuntime` 並正確設定 entitlements，同時確認 App 有通過 Apple 公證（Notarization）。

---

### Q4：Windows SmartScreen 警告

應用程式需要有效的程式碼簽署憑證（EV Certificate 效果最好）。在測試階段可在警告視窗點選「更多資訊 → 仍要執行」繼續。

---

### Q5：開發模式如何測試 autoUpdater？

方法一：強制指定 feedURL 進行本機測試

```js
// 僅用於測試，正式環境請移除
if (!app.isPackaged) {
  autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
}
```

`dev-app-update.yml`：

```yaml
owner: your-github-username
repo: your-repo-name
provider: github
```

方法二：使用 [update-electron-app](https://github.com/electron/update-electron-app) 搭配 [Hazel](https://github.com/vercel/hazel) 本機測試伺服器。

---

## 附錄：完整 `package.json` 範例

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "My Electron Desktop Application",
  "main": "main.js",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "release": "electron-builder --publish always"
  },
  "dependencies": {
    "electron-log": "^5.0.0",
    "electron-updater": "^6.0.0"
  },
  "devDependencies": {
    "electron": "^32.0.0",
    "electron-builder": "^25.0.0"
  },
  "build": {
    "appId": "com.yourcompany.my-electron-app",
    "productName": "My Electron App",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "node_modules/**/*"
    ],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }],
      "icon": "build/icon.icns",
      "category": "public.app-category.utilities"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "build/icon.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    },
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "your-repo-name"
    }
  }
}
```

---

*文件版本：v1.0 ｜ 最後更新：2025 年*
