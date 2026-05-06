import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { notifyStatusUpdateReviewed } from '../../lib/notificationService'

async function rejectStatusUpdateHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { updateId } = req.params

    const update = await prisma.entrepriseStatusUpdate.findUnique({
      where: { id: updateId },
      include: { entreprise: { select: { projectId: true } } },
    })
    if (!update) return { status: 404, jsonBody: { error: 'Statusopdatering ikke fundet' } }
    if (update.approvalStatus !== 'PENDING') {
      return { status: 409, jsonBody: { error: 'Statusopdatering er allerede behandlet' } }
    }

    const rejected = await prisma.entrepriseStatusUpdate.update({
      where: { id: updateId },
      data: { approvalStatus: 'REJECTED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
    })

    await writeAuditLog({ userId: jwtUser.sub, entityType: 'EntrepriseStatusUpdate', entityId: updateId, action: 'REJECT' })

    const project = await prisma.project.findUnique({
      where: { id: update.entreprise.projectId },
      select: { claimId: true },
    })
    if (project) await notifyStatusUpdateReviewed(update.submittedByUserId, false, project.claimId)

    return { status: 200, jsonBody: { data: rejected } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('approvals-reject-status-update', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'status-updates/{updateId}/reject',
  handler: rejectStatusUpdateHandler,
})
