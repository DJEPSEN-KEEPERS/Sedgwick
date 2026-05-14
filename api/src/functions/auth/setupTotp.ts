import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma'
import { errorResponse } from '../../middleware/authMiddleware'
import { verifyAccessToken, verifyTempToken } from '../../lib/jwt'
import { generateTotpSecret, encryptSecret, generateTotpUri } from '../../lib/totp'

async function setupTotpHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Accept either Authorization header (full access token) or tempToken in body (first-time setup)
    let userId: string

    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? ''
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (headerToken) {
      // Logged-in user resetting TOTP
      try {
        userId = verifyAccessToken(headerToken).sub
      } catch {
        return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet token' } }
      }
    } else {
      // First-time setup via tempToken in body
      const body = await req.json().catch(() => ({})) as { tempToken?: string }
      const bodyToken = body.tempToken ?? ''
      if (!bodyToken) return { status: 401, jsonBody: { error: 'Mangler token' } }
      try {
        const decoded = verifyTempToken(bodyToken)
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
