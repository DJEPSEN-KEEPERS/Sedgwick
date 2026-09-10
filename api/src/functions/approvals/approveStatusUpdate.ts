import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { notifyStatusUpdateReviewed } from '../../lib/notificationService'

async function approveStatusUpdateHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { updateId } = req.params

    const update = await prisma.entrepriseStatusUpdate.findUnique({
      where: { id: updateId },
      include: { entreprise: true },
    })
    if (!update) return { status: 404, jsonBody: { error: 'Statusopdatering ikke fundet' } }
    if (update.approvalStatus !== 'PENDING') {
      return { status: 409, jsonBody: { error: 'Statusopdatering er allerede behandlet' } }
    }

    const approved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.entrepriseStatusUpdate.update({
        where: { id: updateId },
        data: { approvalStatus: 'APPROVED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
      })
      await tx.entreprise.update({
        where: { id: update.entrepriseId },
        data: { currentMilestone: update.milestone, progressPercent: update.progressPercent },
      })
      return result
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'EntrepriseStatusUpdate',
      entityId: updateId,
      action: 'APPROVE',
      newValue: { milestone: update.milestone, progressPercent: update.progressPercent },
    })

    const project = await prisma.project.findUnique({
      where: { id: update.entreprise.projectId },
      select: { claimId: true },
    })
    if (project) await notifyStatusUpdateReviewed(update.submittedByUserId, true, project.claimId)

    return { status: 200, jsonBody: { data: approved } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('approvals-approve-status-update', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'status-updates/{updateId}/approve',
  handler: approveStatusUpdateHandler,
})
