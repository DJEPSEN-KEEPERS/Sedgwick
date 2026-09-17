import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import {
  notifyContractorBidSelected,
  notifyContractorBidNotSelected,
  notifyContractorInvitationClosed,
} from '../../lib/notificationService'
import { ensureProjectChannel } from '../../lib/projectChannel'

async function selectBidHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { bidId } = req.params

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { contractor: true },
    })
    if (!bid) return { status: 404, jsonBody: { error: 'Tilbud ikke fundet' } }

    // Load all invitations and competing bids before the transaction
    const allInvitations = await prisma.bidInvitation.findMany({
      where: { projectId: bid.projectId },
      include: { bid: { select: { id: true, contractorId: true } } },
    })

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bid.updateMany({ where: { projectId: bid.projectId, isSelected: true }, data: { isSelected: false } })
      const selected = await tx.bid.update({
        where: { id: bidId },
        data: { isSelected: true, selectedAt: new Date(), selectedByUserId: jwtUser.sub },
      })
      await tx.project.update({
        where: { id: bid.projectId },
        data: { selectedContractorId: bid.contractorId, currentMilestone: 'CONTRACTOR_SELECTED' },
      })
      await tx.contractor.update({
        where: { id: bid.contractorId },
        data: { currentWorkload: { increment: 1 } },
      })
      // Close all open invitations that are not the winner's
      const openStatuses = ['PENDING', 'INTERESTED']
      await tx.bidInvitation.updateMany({
        where: {
          projectId: bid.projectId,
          contractorId: { not: bid.contractorId },
          status: { in: openStatuses },
        },
        data: { status: 'CLOSED_CONTRACTOR_SELECTED' },
      })
      return selected
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Project',
      entityId: bid.projectId,
      action: 'SELECT_BID',
      newValue: { bidId, contractorId: bid.contractorId, companyName: bid.contractor.companyName },
    })

    const project = await prisma.project.findUnique({ where: { id: bid.projectId }, select: { claimId: true } })
    if (project) {
      const claimId = project.claimId

      // Notify winner
      await notifyContractorBidSelected(bid.contractorId, claimId)

      // Notify contractors with non-selected bids and contractors who accepted but didn't bid
      const notifyPromises: Promise<void>[] = []
      for (const inv of allInvitations) {
        if (inv.contractorId === bid.contractorId) continue
        if (inv.bid) {
          // Had a competing bid
          notifyPromises.push(notifyContractorBidNotSelected(inv.contractorId, claimId))
        } else if (inv.status === 'INTERESTED') {
          // Accepted the invitation but never submitted a bid
          notifyPromises.push(notifyContractorInvitationClosed(inv.contractorId, claimId))
        }
        // PENDING invitations get no notification — they never showed interest
      }
      await Promise.all(notifyPromises)
    }

    // Add the contractor's users to the project message thread
    const contractorUsers = await prisma.user.findMany({
      where: { contractorUser: { contractorId: bid.contractorId } },
      select: { id: true },
    })
    if (contractorUsers.length > 0) {
      await ensureProjectChannel(bid.projectId, contractorUsers.map((u) => u.id))
    }

    return { status: 200, jsonBody: { data: updated } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('bids-select', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bids/{bidId}/select',
  handler: selectBidHandler,
})
