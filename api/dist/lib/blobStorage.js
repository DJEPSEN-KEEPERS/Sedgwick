"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTAINER = void 0;
exports.getBlobServiceClient = getBlobServiceClient;
const storage_blob_1 = require("@azure/storage-blob");
exports.CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files';
/**
 * Returns a BlobServiceClient. Prefers AZURE_STORAGE_CONNECTION_STRING;
 * falls back to AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.
 * Throws a clear error when neither is configured.
 */
function getBlobServiceClient() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
        return storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
    }
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    if (accountName && accountKey) {
        const cred = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
        return new storage_blob_1.BlobServiceClient(`https://${accountName}.blob.core.windows.net`, cred);
    }
    throw new Error('Azure Storage er ikke konfigureret. ' +
        'Sæt AZURE_STORAGE_CONNECTION_STRING eller ' +
        'AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.');
}
