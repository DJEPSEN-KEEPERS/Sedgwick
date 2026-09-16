import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { CONTAINER, getSharedKeyCredential } from '../../lib/blobStorage'

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

    const expiresOn = new Date(Date.now() + 60 * 60 * 1000)

    const sharedKeyCredential = getSharedKeyCredential()

    const blobUrlObj = new URL(file.blobUrl)
    const blobName = blobUrlObj.pathname.replace(`/${CONTAINER}/`, '')

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER,
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
