import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'

export const CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files'

function parseConnectionString(connStr: string): { accountName: string; accountKey: string } | null {
  const parts: Record<string, string> = {}
  for (const segment of connStr.split(';')) {
    const idx = segment.indexOf('=')
    if (idx > 0) parts[segment.slice(0, idx)] = segment.slice(idx + 1)
  }
  if (parts['AccountName'] && parts['AccountKey']) {
    return { accountName: parts['AccountName'], accountKey: parts['AccountKey'] }
  }
  return null
}

/**
 * Returns a BlobServiceClient. Prefers AZURE_STORAGE_CONNECTION_STRING;
 * falls back to AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.
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

/**
 * Returns a StorageSharedKeyCredential needed for SAS generation.
 * Parses account name/key from AZURE_STORAGE_CONNECTION_STRING if the
 * individual env vars are not set.
 */
export function getSharedKeyCredential(): StorageSharedKeyCredential {
  let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
  let accountKey  = process.env.AZURE_STORAGE_ACCOUNT_KEY

  if (!accountName || !accountKey) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING ?? ''
    const parsed  = parseConnectionString(connStr)
    if (parsed) {
      accountName = parsed.accountName
      accountKey  = parsed.accountKey
    }
  }

  if (!accountName || !accountKey) {
    throw new Error(
      'Kan ikke generere SAS-token: AZURE_STORAGE_ACCOUNT_NAME/KEY mangler ' +
      'og kunne ikke udtrækkes fra AZURE_STORAGE_CONNECTION_STRING.',
    )
  }
  return new StorageSharedKeyCredential(accountName, accountKey)
}
