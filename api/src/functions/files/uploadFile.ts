import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { BlobServiceClient } from '@azure/storage-blob'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { randomUUID } from 'crypto'

async function uploadFileHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { projectId } = req.params
    const url = new URL(req.url)
    const attachmentCategory = url.searchParams.get('category') ?? 'general'
    const isClientVisible = url.searchParams.get('clientVisible') === 'true'

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    const contentType = req.headers.get('content-type') ?? 'application/octet-stream'
    const fileName = req.headers.get('x-file-name') ?? `upload-${Date.now()}`
    const fileBuffer = Buffer.from(await req.arrayBuffer())
    const fileSizeMb = fileBuffer.length / (1024 * 1024)

    if (fileSizeMb > 50) {
      return { status: 413, jsonBody: { error: 'Filen overstiger maksimal størrelse på 50 MB' } }
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
    const containerName = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files'
    const blobName = `projects/${projectId}/${randomUUID()}-${fileName}`

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    })

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId,
        fileName,
        fileType: contentType,
        blobUrl: blockBlobClient.url,
        fileSizeMb,
        attachmentCategory,
        isClientVisible,
        uploadedByUserId: jwtUser.sub,
      },
    })

    return { status: 201, jsonBody: { data: attachment } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('files-upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/files',
  handler: uploadFileHandler,
})
