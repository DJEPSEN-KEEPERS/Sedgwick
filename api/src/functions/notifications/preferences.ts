import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getPreferencesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: jwtUser.sub },
    })
    return { status: 200, jsonBody: prefs }
  } catch (err) {
    return errorResponse(err, context)
  }
}

async function updatePreferencesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const body = await req.json() as { channel: string; eventType: string; enabled: boolean }[]

    await Promise.all(
      body.map((pref) =>
        prisma.notificationPreference.upsert({
          where: {
            id: `${jwtUser.sub}-${pref.channel}-${pref.eventType}`,
          },
          update: { enabled: pref.enabled },
          create: {
            userId: jwtUser.sub,
            channel: pref.channel,
            eventType: pref.eventType,
            enabled: pref.enabled,
          },
        }),
      ),
    )

    return { status: 200, jsonBody: { message: 'Præferencer opdateret' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('notifications-prefs-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications/preferences',
  handler: getPreferencesHandler,
})

app.http('notifications-prefs-put', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'notifications/preferences',
  handler: updatePreferencesHandler,
})
