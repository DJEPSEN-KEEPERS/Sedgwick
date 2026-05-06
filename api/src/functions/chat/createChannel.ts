import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

interface CreateChannelBody {
  projectId: string
  channelType: 'SEDGWICK_CONTRACTOR' | 'SEDGWICK_INSURER' | 'SEDGWICK_BIDDER'
  name: string
  participantUserIds: string[]
}

async function createChannelHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const body = await req.json() as CreateChannelBody

    if (!body.projectId || !body.channelType || !body.name) {
      return { status: 400, jsonBody: { error: 'projectId, channelType og name er påkrævet' } }
    }

    const allParticipantIds = [...new Set([jwtUser.sub, ...(body.participantUserIds ?? [])])]

    const channel = await prisma.chatChannel.create({
      data: {
        projectId: body.projectId,
        channelType: body.channelType,
        name: body.name,
        createdByUserId: jwtUser.sub,
        participants: {
          create: allParticipantIds.map((userId) => ({ userId })),
        },
      },
      include: { participants: true },
    })

    return { status: 201, jsonBody: { data: channel } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('chat-create-channel', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chat/channels',
  handler: createChannelHandler,
})
