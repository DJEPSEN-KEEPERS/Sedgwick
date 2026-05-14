import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { verifyTempToken } from '../../lib/jwt'
import { generateTotpSecret, encryptSecret, generateTotpUri } from '../../lib/totp'

async function setupTotpHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    let userId: string

    // Accept either a full access token or a temp_2fa token (first-time setup)
    try {
      const jwtUser = authenticate(req)
      userId = jwtUser.sub
    } catch {
      const authHeader = req.headers.get('authorization') ?? ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      const decoded = verifyTempToken(token)
      if (decoded.type !== 'temp_2fa') {
        return { status: 401, jsonBody: { error: 'Ikke autoriseret' } }
      }
      userId = decoded.sub
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } }

    const secret = generateTotpSecret()
    const encryptedSecret = encryptSecret(secret)
    const uri = generateTotpUri(secret, user!.email)
    const qrCodeDataUrl = await QRCode.toDataURL(uri)

    // Store encrypted secret (not yet active until confirmed)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret },
    })

    return {
      status: 200,
      jsonBody: {
        qrCode: qrCodeDataUrl,
        manualKey: secret,
        message: 'Scan QR-koden i din authenticator-app og bekræft',
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-setup-totp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/setup-totp',
  handler: setupTotpHandler,
})
