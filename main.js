// main.js
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
 
// 建立視窗的函式
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });
 
  win.loadFile("index.html");
};
 
// 當 Electron 準備就緒時，建立視窗
app.whenReady().then(() => {
  createWindow();
 
  // macOS: 當沒有視窗時點擊 Dock 圖示，重新建立視窗
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
 
// Windows/Linux: 所有視窗關閉後結束應用程式
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
