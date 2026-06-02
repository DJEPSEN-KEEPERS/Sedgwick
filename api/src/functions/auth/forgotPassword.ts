import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { randomUUID } from 'crypto'
import { prisma } from '../../lib/prisma'
import { sendPasswordResetEmail } from '../../lib/email'
import { errorResponse } from '../../middleware/authMiddleware'

async function forgotPasswordHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { email } = (await req.json()) as { email?: string }

    if (!email?.trim()) {
      return { status: 400, jsonBody: { error: 'E-mail er påkrævet' } }
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, fullName: true, status: true },
    })

    // Always return 200 — never reveal whether an e-mail exists (security)
    if (!user || user.status !== 'ACTIVE') {
      return { status: 200, jsonBody: { message: 'Hvis e-mailen findes, er der sendt et link.' } }
    }

    // Invalidate previous unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    // Create new token — expires in 1 hour
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    })

    const APP_URL = process.env.APP_URL ?? 'https://black-mud-094afdb03.azurestaticapps.net'
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    sendPasswordResetEmail({ toEmail: user.email, fullName: user.fullName, resetUrl })

    return { status: 200, jsonBody: { message: 'Hvis e-mailen findes, er der sendt et link.' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-forgot-password', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/forgot-password',
  handler: forgotPasswordHandler,
})
