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