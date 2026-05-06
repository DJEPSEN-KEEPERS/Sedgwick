import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function markAllReadHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    await prisma.notification.updateMany({
      where: { userId: jwtUser.sub, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() },
    })

    return { status: 200, jsonBody: { message: 'Alle notifikationer markeret som læst' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('notifications-mark-all-read', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'notifications/mark-all-read',
  handler: markAllReadHandler,
})
