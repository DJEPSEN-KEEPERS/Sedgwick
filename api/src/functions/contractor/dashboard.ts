import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function contractorDashboardHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const [activeJobs, pendingInvitations, unreadMessages] = await Promise.all([
      prisma.project.count({
        where: {
          selectedContractorId: contractorId,
          status: 'ACTIVE',
        },
      }),
      prisma.bidInvitation.count({
        where: { contractorId, status: 'PENDING' },
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

    const recentJobs = await prisma.project.findMany({
      where: { selectedContractorId: contractorId, status: 'ACTIVE' },
      select: {
        id: true,
        claimId: true,
        address: true,
        city: true,
        currentMilestone: true,
        progressPercent: true,
        requestedDeadline: true,
        entreprises: {
          where: { contractorId },
          select: { id: true, type: true, currentMilestone: true, progressPercent: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    return {
      status: 200,
      jsonBody: {
        stats: { activeJobs, pendingInvitations, unreadMessages },
        recentJobs,
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
