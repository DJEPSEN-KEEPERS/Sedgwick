import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { signTempToken } from '../../lib/jwt'
import { writeAuditLog } from '../../lib/auditLog'
import { errorResponse } from '../../middleware/authMiddleware'

interface LoginBody {
  email: string
  password: string
}

async function loginHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as LoginBody

    if (!body.email || !body.password) {
      return { status: 400, jsonBody: { error: 'E-mail og adgangskode er påkrævet' } }
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
      include: {
        insurerUser: { include: { insuranceCompany: true } },
        contractorUser: true,
      },
    })

    if (!user) {
      // Constant-time comparison to prevent timing attacks
      await bcrypt.compare(body.password, '$2b$12$invalidhashtopreventtiming')
      return { status: 401, jsonBody: { error: 'Ugyldige loginoplysninger' } }
    }

    if (user.status !== 'ACTIVE') {
      return { status: 403, jsonBody: { error: 'Konto er deaktiveret' } }
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash)
    if (!passwordValid) {
      await writeAuditLog({
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'LOGIN_FAILED',
      })
      return { status: 401, jsonBody: { error: 'Ugyldige loginoplysninger' } }
    }

    // 2FA always required
    const tempToken = signTempToken(user.id)

    await writeAuditLog({
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN_STEP1_OK',
    })

    return {
      status: 200,
      jsonBody: {
        requiresTwoFactor: true,
        tempToken,
        twoFactorMethod: user.twoFactorMethod,
        message: '2FA-kode krævet',
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: loginHandler,
})
