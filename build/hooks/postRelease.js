"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");
const fs = require("fs");

const UPLOAD_EXTENSIONS = [".exe", ".blockmap", ".yml", ".dmg", ".AppImage", ".deb"];

// electron-builder.env is loaded internally by electron-builder but not by standalone scripts.
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
            process.env[match[1].trim()] = match[2].trim();
        }
    }
}

async function uploadArtifacts() {
    loadEnvFile("electron-builder.env");

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_CONTAINER_NAME;
    const blobPrefix = process.env.AZURE_BLOB_PREFIX
        ? process.env.AZURE_BLOB_PREFIX.replace(/\/?$/, "/")
        : "";

    if (!connectionString || !containerName) {
        console.warn("[postRelease] 缺少 AZURE_STORAGE_CONNECTION_STRING 或 AZURE_CONTAINER_NAME，略過上傳。");
        return;
    }

    const outDir = "dist";
    const allFiles = fs.readdirSync(outDir)
        .filter(f => UPLOAD_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .map(f => path.join(outDir, f));

    if (allFiles.length === 0) {
        console.warn("[postRelease] dist/ 中未找到可上傳的檔案。");
        return;
    }

    // Non-yml files first, then other yml files, then latest.yml last.
    // This ensures installers are available before clients detect a new version via latest.yml.
    const nonYmlFiles = allFiles.filter(f => path.extname(f).toLowerCase() !== ".yml");
    const ymlFiles = allFiles.filter(f => path.extname(f).toLowerCase() === ".yml");
    const latestYml = ymlFiles.find(f => path.basename(f) === "latest.yml");
    const otherYmlFiles = ymlFiles.filter(f => path.basename(f) !== "latest.yml");
    const orderedFiles = [...nonYmlFiles, ...otherYmlFiles, ...(latestYml ? [latestYml] : [])];

    const containerClient = BlobServiceClient
        .fromConnectionString(connectionString)
        .getContainerClient(containerName);

    console.log(`[postRelease] 準備上傳 ${orderedFiles.length} 個檔案至 Azure Blob...`);

    for (const filePath of orderedFiles) {
        const fileName = path.basename(filePath);
        const blobName = `${blobPrefix}${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // yml files reuse the same blob name across releases, so delete first to guarantee overwrite.
        if (path.extname(filePath).toLowerCase() === ".yml") {
            await blockBlobClient.deleteIfExists();
        }
        await blockBlobClient.uploadFile(filePath);
        console.log(`[postRelease] 已上傳: ${blobName}`);
    }

    console.log("[postRelease] 上傳完成。");
}

uploadArtifacts().catch(err => {
    console.error("[postRelease] 上傳失敗:", err);
    process.exit(1);
});
