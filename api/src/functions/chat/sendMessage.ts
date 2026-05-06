import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

interface SendMessageBody {
  messageBody: string
}

async function sendMessageHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { channelId } = req.params
    const payload = await req.json() as SendMessageBody

    if (!payload.messageBody?.trim()) {
      return { status: 400, jsonBody: { error: 'Beskedtekst er påkrævet' } }
    }

    const participant = await prisma.chatChannelParticipant.findFirst({
      where: { channelId, userId: jwtUser.sub },
    })
    if (!participant) return { status: 403, jsonBody: { error: 'Ingen adgang til denne kanal' } }

    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        senderUserId: jwtUser.sub,
        messageBody: payload.messageBody.trim(),
      },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    })

    return { status: 201, jsonBody: message }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-send-message', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'channels/{channelId}/messages',
  handler: sendMessageHandler,
})
