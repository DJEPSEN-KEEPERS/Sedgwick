import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

async function logoutHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Attempt to extract user for audit log — not required
    try {
      const jwtUser = authenticate(req)
      await writeAuditLog({
        userId: jwtUser.sub,
        entityType: 'User',
        entityId: jwtUser.sub,
        action: 'LOGOUT',
      })
    } catch {
      // token may be expired — still return success
    }

    return { status: 200, jsonBody: { message: 'Logget ud' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('auth-logout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/logout',
  handler: logoutHandler,
})
