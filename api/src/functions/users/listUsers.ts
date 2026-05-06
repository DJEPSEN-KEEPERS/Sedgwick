import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listUsersHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return { status: 200, jsonBody: users }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('users-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: listUsersHandler,
})
