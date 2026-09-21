import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Ingen håndværker tilknyttet brugeren' } }

    const team = await prisma.contractorUser.findMany({
      where: { contractorId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    })

    return { status: 200, jsonBody: team.map((t) => t.user) }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-my-team', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/my-team',
  handler,
})
