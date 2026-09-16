import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'

export const CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files'

/**
 * Returns a BlobServiceClient. Prefers AZURE_STORAGE_CONNECTION_STRING;
 * falls back to AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.
 * Throws a clear error when neither is configured.
 */
export function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString)
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const accountKey  = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (accountName && accountKey) {
    const cred = new StorageSharedKeyCredential(accountName, accountKey)
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, cred)
  }

  throw new Error(
    'Azure Storage er ikke konfigureret. ' +
    'Sæt AZURE_STORAGE_CONNECTION_STRING eller ' +
    'AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.',
  )
}
