import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { ensureProjectChannel } from '../../lib/projectChannel'

async function getProjectThreadHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { projectId } = req.params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, insuranceCompanyId: true, selectedContractorId: true },
    })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }
    if (jwtUser.role === 'CONTRACTOR_USER' && project.selectedContractorId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const channel = await ensureProjectChannel(projectId, [jwtUser.sub])

    const messages = await prisma.chatMessage.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        attachments: true,
      },
    })

    return { status: 200, jsonBody: { channelId: channel.id, messages } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-get-project-thread', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/thread',
  handler: getProjectThreadHandler,
})
