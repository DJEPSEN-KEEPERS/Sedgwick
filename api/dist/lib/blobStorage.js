"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTAINER = void 0;
exports.getBlobServiceClient = getBlobServiceClient;
exports.getSharedKeyCredential = getSharedKeyCredential;
const storage_blob_1 = require("@azure/storage-blob");
exports.CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files';
function parseConnectionString(connStr) {
    const parts = {};
    for (const segment of connStr.split(';')) {
        const idx = segment.indexOf('=');
        if (idx > 0)
            parts[segment.slice(0, idx)] = segment.slice(idx + 1);
    }
    if (parts['AccountName'] && parts['AccountKey']) {
        return { accountName: parts['AccountName'], accountKey: parts['AccountKey'] };
    }
    return null;
}
/**
 * Returns a BlobServiceClient. Prefers AZURE_STORAGE_CONNECTION_STRING;
 * falls back to AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.
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
/**
 * Returns a StorageSharedKeyCredential needed for SAS generation.
 * Parses account name/key from AZURE_STORAGE_CONNECTION_STRING if the
 * individual env vars are not set.
 */
function getSharedKeyCredential() {
    let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    let accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    if (!accountName || !accountKey) {
        const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING ?? '';
        const parsed = parseConnectionString(connStr);
        if (parsed) {
            accountName = parsed.accountName;
            accountKey = parsed.accountKey;
        }
    }
    if (!accountName || !accountKey) {
        throw new Error('Kan ikke generere SAS-token: AZURE_STORAGE_ACCOUNT_NAME/KEY mangler ' +
            'og kunne ikke udtrækkes fra AZURE_STORAGE_CONNECTION_STRING.');
    }
    return new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
}
