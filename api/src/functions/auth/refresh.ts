import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { verifyRefreshToken, signAccessToken } from '../../lib/jwt'
import { errorResponse } from '../../middleware/authMiddleware'

interface RefreshBody {
  refreshToken: string
}

async function refreshHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as RefreshBody

    if (!body.refreshToken) {
      return { status: 400, jsonBody: { error: 'refreshToken er påkrævet' } }
    }

    let decoded: { sub: string; type: string }
    try {
      decoded = verifyRefreshToken(body.refreshToken)
    } catch {
      return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet refresh token' } }
    }

    if (decoded.type !== 'refresh') {
      return { status: 401, jsonBody: { error: 'Ugyldig token type' } }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
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

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      linkedEntityId,
    })

    return {
      status: 200,
      jsonBody: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorMethod: user.twoFactorMethod,
          linkedEntityId,
        },
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh',
  handler: refreshHandler,
})
