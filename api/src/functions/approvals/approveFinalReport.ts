import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { notifyFinalReportReviewed } from '../../lib/notificationService'

async function approveFinalReportHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { reportId } = req.params

    const report = await prisma.finalReport.findUnique({
      where: { id: reportId },
      include: { entreprise: { select: { projectId: true } } },
    })
    if (!report) return { status: 404, jsonBody: { error: 'Slutrapport ikke fundet' } }
    if (report.approvalStatus !== 'PENDING') {
      return { status: 409, jsonBody: { error: 'Slutrapport er allerede behandlet' } }
    }

    const projectId = report.entreprise.projectId

    const approved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.finalReport.update({
        where: { id: reportId },
        data: { approvalStatus: 'APPROVED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
      })
      await tx.project.update({
        where: { id: projectId },
        data: { currentMilestone: 'CASE_CLOSED', status: 'COMPLETED', finalCompletionDate: new Date(), progressPercent: 100 },
      })
      return result
    })

    await writeAuditLog({ userId: jwtUser.sub, entityType: 'FinalReport', entityId: reportId, action: 'APPROVE', newValue: { projectId } })

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { claimId: true } })
    if (project) await notifyFinalReportReviewed(report.submittedByUserId, true, project.claimId)

    return { status: 200, jsonBody: { data: approved } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('approvals-approve-final-report', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'final-reports/{reportId}/approve',
  handler: approveFinalReportHandler,
})
