import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { BlobServiceClient } from '@azure/storage-blob'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { randomUUID } from 'crypto'

async function uploadBidAttachmentHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const { bidId } = req.params

    const bid = await prisma.bid.findUnique({ where: { id: bidId } })
    if (!bid) return { status: 404, jsonBody: { error: 'Bud ikke fundet' } }
    if (bid.contractorId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang til dette bud' } }
    }

    const contentType = req.headers.get('content-type') ?? 'application/octet-stream'
    const rawName = req.headers.get('x-file-name') ?? `upload-${Date.now()}`
    const fileName = decodeURIComponent(rawName)
    const fileBuffer = Buffer.from(await req.arrayBuffer())
    const fileSizeMb = fileBuffer.length / (1024 * 1024)

    if (fileSizeMb > 50) {
      return { status: 413, jsonBody: { error: 'Filen overstiger maksimal størrelse på 50 MB' } }
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
    const containerName = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files'
    const blobName = `bids/${bidId}/${randomUUID()}-${fileName}`

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    })

    const attachment = await prisma.bidAttachment.create({
      data: {
        bidId,
        fileName,
        fileType: contentType,
        blobUrl: blockBlobClient.url,
        fileSizeMb,
      },
    })

    return { status: 201, jsonBody: attachment }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('bids-upload-attachment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bids/{bidId}/attachments',
  handler: uploadBidAttachmentHandler,
})
