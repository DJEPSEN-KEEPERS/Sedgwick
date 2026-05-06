import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function markReadHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { notificationId } = req.params

    const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
    if (!notification) return { status: 404, jsonBody: { error: 'Notifikation ikke fundet' } }
    if (notification.userId !== jwtUser.sub) return { status: 403, jsonBody: { error: 'Ingen adgang' } }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'sent', sentAt: new Date() },
    })

    return { status: 200, jsonBody: { message: 'Markeret som læst' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('notifications-mark-read', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'notifications/{notificationId}/read',
  handler: markReadHandler,
})
