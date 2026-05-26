"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");

const UPLOAD_EXTENSIONS = [".exe", ".blockmap", ".yml", ".dmg", ".AppImage", ".deb"];

exports.default = async function afterAllArtifactBuild(context) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_CONTAINER_NAME;
    const blobPrefix = process.env.AZURE_BLOB_PREFIX
        ? process.env.AZURE_BLOB_PREFIX.replace(/\/?$/, "/")
        : "";

    if (!connectionString || !containerName) {
        console.warn("[afterAllArtifactBuild] 缺少 AZURE_STORAGE_CONNECTION_STRING 或 AZURE_CONTAINER_NAME，略過上傳。");
        return;
    }

    const containerClient = BlobServiceClient
        .fromConnectionString(connectionString)
        .getContainerClient(containerName);

    const allFiles = context.artifactPaths.filter(p =>
        UPLOAD_EXTENSIONS.includes(path.extname(p).toLowerCase())
    );

    // yml files must be uploaded last so installers are available before latest.yml is updated.
    // latest.yml itself must be the very last file uploaded.
    const nonYmlFiles = allFiles.filter(p => path.extname(p).toLowerCase() !== ".yml");
    const ymlFiles = allFiles.filter(p => path.extname(p).toLowerCase() === ".yml");
    const latestYml = ymlFiles.find(p => path.basename(p) === "latest.yml");
    const otherYmlFiles = ymlFiles.filter(p => path.basename(p) !== "latest.yml");
    const orderedFiles = [...nonYmlFiles, ...otherYmlFiles, ...(latestYml ? [latestYml] : [])];

    console.log(`[afterAllArtifactBuild] 準備上傳 ${orderedFiles.length} 個檔案至 Azure Blob...`);

    for (const filePath of orderedFiles) {
        const fileName = path.basename(filePath);
        const blobName = `${blobPrefix}${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // yml files reuse the same blob name across releases, so delete first to guarantee overwrite.
        if (path.extname(filePath).toLowerCase() === ".yml") {
            await blockBlobClient.deleteIfExists();
        }
        await blockBlobClient.uploadFile(filePath);
        console.log(`[afterAllArtifactBuild] 已上傳: ${blobName}`);
    }

    console.log("[afterAllArtifactBuild] 上傳完成。");
};
