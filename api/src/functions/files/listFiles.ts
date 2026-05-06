import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listFilesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { projectId } = req.params
    const url = new URL(req.url)
    const clientVisibleParam = url.searchParams.get('clientVisible')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    if (jwtUser.role === 'INSURER_USER') {
      if (project.insuranceCompanyId !== jwtUser.linkedEntityId) {
        return { status: 403, jsonBody: { error: 'Ingen adgang' } }
      }
    }

    const where: Record<string, unknown> = { projectId }
    if (jwtUser.role === 'INSURER_USER' || clientVisibleParam === 'true') {
      where.isClientVisible = true
    }

    const files = await prisma.projectAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return { status: 200, jsonBody: { files } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('files-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/files',
  handler: listFilesHandler,
})
