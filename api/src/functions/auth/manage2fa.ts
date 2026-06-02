import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

/**
 * PATCH /auth/2fa
 * Body: { enabled: boolean }
 *
 * Self-service: any logged-in user can toggle their own 2FA.
 * - Disabling: clears twoFactorSecret so no TOTP is needed at next login.
 * - Enabling:  sets twoFactorEnabled=true and clears the old secret so a
 *              fresh TOTP setup is forced on next login.
 */
async function manage2faHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const body = (await req.json()) as { enabled: boolean }

    if (typeof body.enabled !== 'boolean') {
      return { status: 400, jsonBody: { error: 'enabled (boolean) er påkrævet' } }
    }

    await prisma.user.update({
      where: { id: jwtUser.sub },
      data: {
        twoFactorEnabled: body.enabled,
        // Always clear the secret when toggling — forces fresh TOTP setup on re-enable
        twoFactorSecret: null,
      },
    })

    return {
      status: 200,
      jsonBody: {
        twoFactorEnabled: body.enabled,
        message: body.enabled
          ? '2FA er aktiveret. Du skal opsætte din authenticator-app ved næste login.'
          : '2FA er deaktiveret.',
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

/**
 * POST /auth/2fa/reset/{userId}
 *
 * Admin-only: reset another user's 2FA secret (e.g. lost authenticator).
 * Clears twoFactorSecret so fresh TOTP setup is forced on next login.
 */
async function admin2faResetHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { userId } = req.params

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    })
    if (!target) {
      return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: true, // re-enable in case it was turned off
      },
    })

    return {
      status: 200,
      jsonBody: { message: `2FA nulstillet for ${target.fullName}. Brugeren opsætter ny authenticator ved næste login.` },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

/**
 * POST /auth/confirm-totp-setup
 * Body: { code: string }
 *
 * Confirms a newly scanned TOTP secret for a logged-in user.
 * Verifies the code against the stored (but unconfirmed) secret.
 */
async function confirmTotpSetupHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { code } = (await req.json()) as { code?: string }

    if (!code || code.length !== 6) {
      return { status: 400, jsonBody: { error: '6-cifret kode er påkrævet' } }
    }

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: { id: true, twoFactorSecret: true },
    })
    if (!user?.twoFactorSecret) {
      return { status: 400, jsonBody: { error: 'Ingen TOTP-konfiguration at bekræfte' } }
    }

    // Lazy import to avoid circular deps
    const { verifyTotpToken } = await import('../../lib/totp')
    const valid = verifyTotpToken(user.twoFactorSecret, code)
    if (!valid) {
      return { status: 401, jsonBody: { error: 'Forkert kode — tjek din authenticator-app og prøv igen' } }
    }

    // Mark 2FA as confirmed and active
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    })

    return { status: 200, jsonBody: { message: '2FA er nu aktiv. Koden accepteret.' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-manage-2fa', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'auth/2fa',
  handler: manage2faHandler,
})

app.http('auth-admin-reset-2fa', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/2fa/reset/{userId}',
  handler: admin2faResetHandler,
})

app.http('auth-confirm-totp-setup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/confirm-totp-setup',
  handler: confirmTotpSetupHandler,
})
