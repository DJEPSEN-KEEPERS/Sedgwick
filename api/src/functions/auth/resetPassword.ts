import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { errorResponse } from '../../middleware/authMiddleware'

async function resetPasswordHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { token, password } = (await req.json()) as { token?: string; password?: string }

    if (!token?.trim()) {
      return { status: 400, jsonBody: { error: 'Token mangler' } }
    }
    if (!password || password.length < 8) {
      return { status: 400, jsonBody: { error: 'Adgangskoden skal være mindst 8 tegn' } }
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, status: true } } },
    })

    if (!record) {
      return { status: 400, jsonBody: { error: 'Ugyldigt eller udløbet link' } }
    }
    if (record.usedAt) {
      return { status: 400, jsonBody: { error: 'Dette link er allerede brugt' } }
    }
    if (record.expiresAt < new Date()) {
      return { status: 400, jsonBody: { error: 'Linket er udløbet — anmod om et nyt' } }
    }
    if (record.user.status !== 'ACTIVE') {
      return { status: 403, jsonBody: { error: 'Kontoen er deaktiveret' } }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Update password, clear TOTP secret (forces fresh setup on next login),
    // and mark token used — all in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          twoFactorSecret: null,   // cleared → fresh TOTP setup on next login
          twoFactorEnabled: true,  // keep enforcement on
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { status: 200, jsonBody: { message: 'Adgangskoden er opdateret. Du kan nu logge ind.' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-reset-password', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/reset-password',
  handler: resetPasswordHandler,
})
