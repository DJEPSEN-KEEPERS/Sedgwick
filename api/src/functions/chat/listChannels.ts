import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listChannelsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') ?? undefined

    const channels = await prisma.chatChannel.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        participants: { some: { userId: jwtUser.sub } },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, messageBody: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { status: 200, jsonBody: { data: channels } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-list-channels', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'chat/channels',
  handler: listChannelsHandler,
})
