import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function bidsOverviewHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const [awaitingInvitations, receivedBids, recentDecisions] = await Promise.all([
      prisma.bidInvitation.findMany({
        where: { status: 'PENDING' },
        include: {
          project: { select: { id: true, claimId: true } },
          contractor: { select: { companyName: true } },
        },
        orderBy: { invitedAt: 'desc' },
        take: 20,
      }),
      prisma.bid.findMany({
        where: { isSelected: false },
        include: {
          project: { select: { id: true, claimId: true } },
          contractor: { select: { companyName: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      }),
      prisma.bid.findMany({
        where: { isSelected: true },
        include: {
          project: { select: { id: true, claimId: true } },
          contractor: { select: { companyName: true } },
        },
        orderBy: { selectedAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      status: 200,
      jsonBody: {
        awaitingResponse: awaitingInvitations.map((i: any) => ({
          id: i.id,
          projectId: i.project.id,
          claimId: i.project.claimId,
          contractorName: i.contractor.companyName,
          invitedAt: i.invitedAt.toISOString(),
        })),
        bidsReceived: receivedBids.map((b: any) => ({
          id: b.id,
          projectId: b.project.id,
          claimId: b.project.claimId,
          contractorName: b.contractor.companyName,
          bidAmount: b.bidAmount,
          currency: b.currency,
          submittedAt: b.submittedAt.toISOString(),
        })),
        recentDecisions: recentDecisions.map((b: any) => ({
          id: b.id,
          projectId: b.project.id,
          claimId: b.project.claimId,
          contractorName: b.contractor.companyName,
          bidAmount: b.bidAmount,
          currency: b.currency,
          selectedAt: b.selectedAt!.toISOString(),
        })),
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('bids-overview', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'bids/overview',
  handler: bidsOverviewHandler,
})
