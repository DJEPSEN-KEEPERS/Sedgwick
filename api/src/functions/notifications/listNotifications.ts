import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listNotificationsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const notifications = await prisma.notification.findMany({
      where: { userId: jwtUser.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return { status: 200, jsonBody: notifications }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('notifications-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications',
  handler: listNotificationsHandler,
})
