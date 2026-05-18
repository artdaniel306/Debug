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