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