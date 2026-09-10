"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function rejectFinalReportHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { reportId } = req.params;
        const report = await prisma_1.prisma.finalReport.findUnique({ where: { id: reportId } });
        if (!report)
            return { status: 404, jsonBody: { error: 'Slutrapport ikke fundet' } };
        if (report.approvalStatus !== 'PENDING') {
            return { status: 409, jsonBody: { error: 'Slutrapport er allerede behandlet' } };
        }
        const rejected = await prisma_1.prisma.finalReport.update({
            where: { id: reportId },
            data: { approvalStatus: 'REJECTED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
        });
        await (0, auditLog_1.writeAuditLog)({ userId: jwtUser.sub, entityType: 'FinalReport', entityId: reportId, action: 'REJECT' });
        return { status: 200, jsonBody: { data: rejected } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('approvals-reject-final-report', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'final-reports/{reportId}/reject',
    handler: rejectFinalReportHandler,
});
