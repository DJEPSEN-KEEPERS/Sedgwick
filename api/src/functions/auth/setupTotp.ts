import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { generateTotpSecret, encryptSecret, generateTotpUri } from '../../lib/totp'

async function setupTotpHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const user = await prisma.user.findUnique({ where: { id: jwtUser.sub } })
    if (!user) return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } }

    const secret = generateTotpSecret()
    const encryptedSecret = encryptSecret(secret)
    const uri = generateTotpUri(secret, user.email)
    const qrCodeDataUrl = await QRCode.toDataURL(uri)

    // Store encrypted secret (not yet active until confirmed)
    await prisma.user.update({
      where: { id: user.id },
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
