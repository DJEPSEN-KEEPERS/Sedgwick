import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { verifyTempToken, signAccessToken, signRefreshToken } from '../../lib/jwt'
import { verifyTotpToken } from '../../lib/totp'
import { writeAuditLog } from '../../lib/auditLog'
import { errorResponse } from '../../middleware/authMiddleware'

interface VerifyBody {
  tempToken: string
  code: string
}

async function verify2faHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as VerifyBody

    if (!body.tempToken || !body.code) {
      return { status: 400, jsonBody: { error: 'tempToken og code er påkrævet' } }
    }

    let decoded: { sub: string; type: string }
    try {
      decoded = verifyTempToken(body.tempToken)
    } catch {
      return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet temp token' } }
    }

    if (decoded.type !== 'temp_2fa') {
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

    // Verify TOTP
    if (user.twoFactorMethod === 'TOTP') {
      if (!user.twoFactorSecret) {
        return { status: 400, jsonBody: { error: '2FA ikke konfigureret' } }
      }
      const valid = verifyTotpToken(user.twoFactorSecret, body.code)
      if (!valid) {
        await writeAuditLog({
          userId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: '2FA_FAILED',
        })
        return { status: 401, jsonBody: { error: 'Ugyldig 2FA-kode' } }
      }
    }
    // SMS verification would go here when enabled

    // Build linked entity id
    const linkedEntityId =
      user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      linkedEntityId,
    })
    const refreshToken = signRefreshToken(user.id)

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await writeAuditLog({
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN_SUCCESS',
    })

    return {
      status: 200,
      jsonBody: {
        accessToken,
        refreshToken,
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

app.http('auth-verify-2fa', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/verify-2fa',
  handler: verify2faHandler,
})
