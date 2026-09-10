"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
async function approveStatusUpdateHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { updateId } = req.params;
        const update = await prisma_1.prisma.entrepriseStatusUpdate.findUnique({
            where: { id: updateId },
            include: { entreprise: true },
        });
        if (!update)
            return { status: 404, jsonBody: { error: 'Statusopdatering ikke fundet' } };
        if (update.approvalStatus !== 'PENDING') {
            return { status: 409, jsonBody: { error: 'Statusopdatering er allerede behandlet' } };
        }
        const approved = await prisma_1.prisma.$transaction(async (tx) => {
            const result = await tx.entrepriseStatusUpdate.update({
                where: { id: updateId },
                data: { approvalStatus: 'APPROVED', approvedByUserId: jwtUser.sub, approvedAt: new Date() },
            });
            await tx.entreprise.update({
                where: { id: update.entrepriseId },
                data: { currentMilestone: update.milestone, progressPercent: update.progressPercent },
            });
            return result;
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'EntrepriseStatusUpdate',
            entityId: updateId,
            action: 'APPROVE',
            newValue: { milestone: update.milestone, progressPercent: update.progressPercent },
        });
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: update.entreprise.projectId },
            select: { claimId: true },
        });
        if (project)
            await (0, notificationService_1.notifyStatusUpdateReviewed)(update.submittedByUserId, true, project.claimId);
        return { status: 200, jsonBody: { data: approved } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('approvals-approve-status-update', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'status-updates/{updateId}/approve',
    handler: approveStatusUpdateHandler,
});
