import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function contractorDashboardHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const [activeJobs, pendingInvitations, awaitingBid, unreadMessages] = await Promise.all([
      prisma.project.count({
        where: {
          selectedContractorId: contractorId,
          status: 'ACTIVE',
        },
      }),
      prisma.bidInvitation.count({
        where: { contractorId, status: 'PENDING' },
      }),
      prisma.bidInvitation.count({
        where: { contractorId, status: 'INTERESTED', bid: null },
      }),
      prisma.chatMessage.count({
        where: {
          channel: {
            project: { selectedContractorId: contractorId },
          },
          createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        },
      }),
    ])

    return {
      status: 200,
      jsonBody: {
        stats: { activeJobs, pendingInvitations, awaitingBid, unreadMessages },
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-dashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/dashboard',
  handler: contractorDashboardHandler,
})
