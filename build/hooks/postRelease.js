"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");
const fs = require("fs");

// electron-builder.env is loaded by electron-builder internally but not by standalone scripts.
// We parse it here so credentials are available without requiring them to be pre-exported.
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
            process.env[match[1].trim()] = match[2].trim();
        }
    }
}

async function uploadYmlFiles() {
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
    const ymlFiles = fs.readdirSync(outDir)
        .filter(f => f.endsWith(".yml"))
        .map(f => path.join(outDir, f));

    if (ymlFiles.length === 0) {
        console.warn("[postRelease] dist/ 中未找到 .yml 檔案，略過上傳。");
        return;
    }

    const containerClient = BlobServiceClient
        .fromConnectionString(connectionString)
        .getContainerClient(containerName);

    // latest.yml must be uploaded last so clients don't detect a new version
    // before the installers finish uploading (installers are handled by afterAllArtifactBuild).
    const latestYml = ymlFiles.find(f => path.basename(f) === "latest.yml");
    const otherYmlFiles = ymlFiles.filter(f => path.basename(f) !== "latest.yml");
    const orderedYmlFiles = [...otherYmlFiles, ...(latestYml ? [latestYml] : [])];

    console.log(`[postRelease] 準備上傳 ${orderedYmlFiles.length} 個 yml 檔案至 Azure Blob...`);

    for (const filePath of orderedYmlFiles) {
        const fileName = path.basename(filePath);
        const blobName = `${blobPrefix}${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();
        await blockBlobClient.uploadFile(filePath);
        console.log(`[postRelease] 已上傳: ${blobName}`);
    }

    console.log("[postRelease] yml 上傳完成。");
}

uploadYmlFiles().catch(err => {
    console.error("[postRelease] 上傳失敗:", err);
    process.exit(1);
});
