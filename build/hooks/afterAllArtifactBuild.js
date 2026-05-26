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

    const filesToUpload = context.artifactPaths.filter(p =>
        UPLOAD_EXTENSIONS.includes(path.extname(p).toLowerCase())
    );

    console.log(`[afterAllArtifactBuild] 準備上傳 ${filesToUpload.length} 個檔案至 Azure Blob...`);

    for (const filePath of filesToUpload) {
        const fileName = path.basename(filePath);
        const blobName = `${blobPrefix}${fileName}`;
        await containerClient.getBlockBlobClient(blobName).uploadFile(filePath, { overwrite: true });
        console.log(`[afterAllArtifactBuild] 已上傳: ${blobName}`);
    }

    console.log("[afterAllArtifactBuild] 上傳完成。");
};
