import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function inboxHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const channels = await prisma.chatChannel.findMany({
      where: {
        channelType: 'PROJECT',
        participants: { some: { userId: jwtUser.sub } },
      },
      include: {
        project: {
          select: { id: true, claimId: true, address: true, city: true, currentMilestone: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { fullName: true } } },
        },
      },
    })

    const items = channels
      .map((ch) => {
        const latest = ch.messages[0] ?? null
        return {
          projectId: ch.project.id,
          claimId: ch.project.claimId,
          address: ch.project.address,
          city: ch.project.city,
          currentMilestone: ch.project.currentMilestone,
          latestMessage: latest
            ? {
                messageBody: latest.messageBody,
                senderName: (latest as any).sender.fullName,
                createdAt: (latest.createdAt as Date).toISOString(),
              }
            : null,
        }
      })
      .sort((a, b) => {
        if (!a.latestMessage && !b.latestMessage) return 0
        if (!a.latestMessage) return 1
        if (!b.latestMessage) return -1
        return new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime()
      })

    return { status: 200, jsonBody: { items } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('messages-inbox', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'messages/inbox',
  handler: inboxHandler,
})
