// renderer.js
const info = document.getElementById("info");
info.innerText = 
  `使用 Chrome v${versions.chrome()}, ` +
  `Node.js v${versions.node()}, ` +
  `Electron v${versions.electron()}`;
