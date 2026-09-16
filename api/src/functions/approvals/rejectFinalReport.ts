import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { notifyFinalReportReviewed } from '../../lib/notificationService'

async function rejectFinalReportHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const rejected = await prisma.finalReport.update({
      where: { id: reportId },
      data: { approvalStatus: 'REJECTED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
    })

    await writeAuditLog({ userId: jwtUser.sub, entityType: 'FinalReport', entityId: reportId, action: 'REJECT' })

    const project = await prisma.project.findUnique({
      where: { id: report.entreprise.projectId },
      select: { claimId: true },
    })
    if (project) await notifyFinalReportReviewed(report.submittedByUserId, false, project.claimId)

    return { status: 200, jsonBody: { data: rejected } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('approvals-reject-final-report', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'final-reports/{reportId}/reject',
  handler: rejectFinalReportHandler,
})
