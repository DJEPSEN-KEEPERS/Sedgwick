import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getMyProfileHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const [contractor, user, notificationPrefs] = await Promise.all([
      prisma.contractor.findUnique({
        where: { id: contractorId },
        include: {
          regions: true,
          skills: { include: { skill: true } },
          certifications: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: jwtUser.sub },
        select: { id: true, email: true, fullName: true, phone: true, twoFactorEnabled: true, twoFactorMethod: true },
      }),
      prisma.notificationPreference.findMany({ where: { userId: jwtUser.sub } }),
    ])

    if (!contractor) return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } }

    return { status: 200, jsonBody: { contractor, user, notificationPrefs } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-my-profile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/profile',
  handler: getMyProfileHandler,
})
