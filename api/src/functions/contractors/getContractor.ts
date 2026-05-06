import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getContractorHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN', 'CONTRACTOR_USER')

    const { contractorId } = req.params
    const targetId = jwtUser.role === 'CONTRACTOR_USER' ? jwtUser.linkedEntityId! : contractorId

    const contractor = await prisma.contractor.findUnique({
      where: { id: targetId },
      include: {
        regions: true,
        skills: { include: { skill: true } },
        certifications: true,
        users: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true, status: true } },
          },
        },
        sedgwickReviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        clientReviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!contractor) return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } }

    return { status: 200, jsonBody: { data: contractor } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractors-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractors/{contractorId}',
  handler: getContractorHandler,
})
