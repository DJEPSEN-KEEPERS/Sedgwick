import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getSignedUrlHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { fileId } = req.params

    const file = await prisma.projectAttachment.findUnique({
      where: { id: fileId },
      include: { project: true },
    })
    if (!file) return { status: 404, jsonBody: { error: 'Fil ikke fundet' } }

    if (jwtUser.role === 'INSURER_USER') {
      if (file.project.insuranceCompanyId !== jwtUser.linkedEntityId || !file.isClientVisible) {
        return { status: 403, jsonBody: { error: 'Ingen adgang' } }
      }
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!
    const containerName = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files'

    // Extract blob name from the stored blobUrl path
    const blobUrlObj = new URL(file.blobUrl)
    const blobName = blobUrlObj.pathname.replace(`/${containerName}/`, '')

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey)
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      sharedKeyCredential,
    ).toString()

    const signedUrl = `${file.blobUrl}?${sasToken}`

    return { status: 200, jsonBody: { url: signedUrl, expiresAt: expiresOn.toISOString() } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('files-get-signed-url', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'files/{fileId}/signed-url',
  handler: getSignedUrlHandler,
})
