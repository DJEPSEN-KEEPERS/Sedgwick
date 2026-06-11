"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
async function approveFinalReportHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { reportId } = req.params;
        const report = await prisma_1.prisma.finalReport.findUnique({
            where: { id: reportId },
            include: { entreprise: { select: { projectId: true } } },
        });
        if (!report)
            return { status: 404, jsonBody: { error: 'Slutrapport ikke fundet' } };
        if (report.approvalStatus !== 'PENDING') {
            return { status: 409, jsonBody: { error: 'Slutrapport er allerede behandlet' } };
        }
        const projectId = report.entreprise.projectId;
        const approved = await prisma_1.prisma.$transaction(async (tx) => {
            const result = await tx.finalReport.update({
                where: { id: reportId },
                data: { approvalStatus: 'APPROVED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
            });
            await tx.project.update({
                where: { id: projectId },
                data: { currentMilestone: 'CASE_INVOICED', progressPercent: 100 },
            });
            return result;
        });
        await (0, auditLog_1.writeAuditLog)({ userId: jwtUser.sub, entityType: 'FinalReport', entityId: reportId, action: 'APPROVE', newValue: { projectId } });
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId }, select: { claimId: true } });
        if (project)
            await (0, notificationService_1.notifyFinalReportReviewed)(report.submittedByUserId, true, project.claimId);
        return { status: 200, jsonBody: { data: approved } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('approvals-approve-final-report', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'final-reports/{reportId}/approve',
    handler: approveFinalReportHandler,
});
