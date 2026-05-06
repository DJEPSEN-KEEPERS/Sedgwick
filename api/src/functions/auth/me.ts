import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function meHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.sub },
      include: {
        insurerUser: true,
        contractorUser: true,
      },
    })

    if (!user || user.status !== 'ACTIVE') {
      return { status: 401, jsonBody: { error: 'Bruger ikke fundet eller inaktiv' } }
    }

    const linkedEntityId =
      user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null

    return {
      status: 200,
      jsonBody: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        lastLoginAt: user.lastLoginAt,
        linkedEntityId,
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/me',
  handler: meHandler,
})
