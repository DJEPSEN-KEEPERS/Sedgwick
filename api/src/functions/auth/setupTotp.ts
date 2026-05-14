import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma'
import { errorResponse } from '../../middleware/authMiddleware'
import { verifyAccessToken, verifyTempToken } from '../../lib/jwt'
import { generateTotpSecret, encryptSecret, generateTotpUri } from '../../lib/totp'

async function setupTotpHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Extract bearer token
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return { status: 401, jsonBody: { error: 'Mangler authorization token' } }

    // Accept either a full access token or a temp_2fa token (first-time setup)
    let userId: string
    try {
      userId = verifyAccessToken(token).sub
    } catch {
      try {
        const decoded = verifyTempToken(token)
        if (decoded.type !== 'temp_2fa') {
          return { status: 401, jsonBody: { error: 'Ugyldig token type' } }
        }
        userId = decoded.sub
      } catch {
        return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet token' } }
      }
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
