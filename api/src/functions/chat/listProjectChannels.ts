import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listProjectChannelsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { projectId } = req.params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const channelTypeFilter =
      jwtUser.role === 'INSURER_USER' ? { channelType: 'SEDGWICK_INSURER' as const } : {}

    const channels = await prisma.chatChannel.findMany({
      where: {
        projectId,
        ...channelTypeFilter,
        participants: { some: { userId: jwtUser.sub } },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, messageBody: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { status: 200, jsonBody: channels }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-list-project-channels', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/channels',
  handler: listProjectChannelsHandler,
})
