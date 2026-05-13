"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
async function rejectStatusUpdateHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { updateId } = req.params;
        const update = await prisma_1.prisma.entrepriseStatusUpdate.findUnique({
            where: { id: updateId },
            include: { entreprise: { select: { projectId: true } } },
        });
        if (!update)
            return { status: 404, jsonBody: { error: 'Statusopdatering ikke fundet' } };
        if (update.approvalStatus !== 'PENDING') {
            return { status: 409, jsonBody: { error: 'Statusopdatering er allerede behandlet' } };
        }
        const rejected = await prisma_1.prisma.entrepriseStatusUpdate.update({
            where: { id: updateId },
            data: { approvalStatus: 'REJECTED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
        });
        await (0, auditLog_1.writeAuditLog)({ userId: jwtUser.sub, entityType: 'EntrepriseStatusUpdate', entityId: updateId, action: 'REJECT' });
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: update.entreprise.projectId },
            select: { claimId: true },
        });
        if (project)
            await (0, notificationService_1.notifyStatusUpdateReviewed)(update.submittedByUserId, false, project.claimId);
        return { status: 200, jsonBody: { data: rejected } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('approvals-reject-status-update', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'status-updates/{updateId}/reject',
    handler: rejectStatusUpdateHandler,
});
