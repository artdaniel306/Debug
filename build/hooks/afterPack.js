"use strict";

const fs = require("fs");
const path = require("path");

// electron-builder Arch enum: x64=1, arm64=3
const ARCH_ARM64 = 3;

exports.default = async function afterPack(context) {
    const { appOutDir, electronPlatformName, arch, packager } = context;
    const productName = packager.appInfo.productName;

    let srcBin;
    if (electronPlatformName === "win32") {
        srcBin = path.join(__dirname, "../bin/win/uv.exe");
    } else if (electronPlatformName === "darwin") {
        srcBin = path.join(__dirname, arch === ARCH_ARM64 ? "../bin/mac-arm64/uv" : "../bin/mac-x64/uv");
    } else {
        srcBin = path.join(__dirname, "../bin/linux/uv");
    }

    const resourcesDir =
        electronPlatformName === "darwin"
            ? path.join(appOutDir, `${productName}.app`, "Contents", "Resources")
            : path.join(appOutDir, "resources");

    const uvName = electronPlatformName === "win32" ? "uv.exe" : "uv";
    const destDir = path.join(resourcesDir, "uv");
    const destBin = path.join(destDir, uvName);

    if (!fs.existsSync(srcBin)) {
        throw new Error(`[afterPack] 找不到平台二進位：${srcBin}\n請確認 build/bin/ 目錄已包含對應平台的 uv 執行檔。`);
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcBin, destBin);
    if (electronPlatformName !== "win32") {
        fs.chmodSync(destBin, 0o755);
    }

    console.log(`[afterPack] uv copied: ${srcBin} → ${destBin}`);
};
