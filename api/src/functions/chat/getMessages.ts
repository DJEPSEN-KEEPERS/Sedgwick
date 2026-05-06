import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getMessagesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { channelId } = req.params
    const url = new URL(req.url)
    const before = url.searchParams.get('before') ?? undefined
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '50'))

    const participant = await prisma.chatChannelParticipant.findFirst({
      where: { channelId, userId: jwtUser.sub },
    })
    if (!participant) return { status: 403, jsonBody: { error: 'Ingen adgang til denne kanal' } }

    const messages = await prisma.chatMessage.findMany({
      where: {
        channelId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return { status: 200, jsonBody: messages.reverse() }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-get-messages', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'channels/{channelId}/messages',
  handler: getMessagesHandler,
})
