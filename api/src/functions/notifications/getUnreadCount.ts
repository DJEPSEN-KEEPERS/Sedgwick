import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getUnreadCountHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const count = await prisma.notification.count({
      where: { userId: jwtUser.sub, status: 'pending' },
    })

    return { status: 200, jsonBody: { count } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('notifications-unread-count', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications/unread-count',
  handler: getUnreadCountHandler,
})
