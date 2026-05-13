"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
async function selectBidHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { bidId } = req.params;
        const bid = await prisma_1.prisma.bid.findUnique({
            where: { id: bidId },
            include: { contractor: true },
        });
        if (!bid)
            return { status: 404, jsonBody: { error: 'Tilbud ikke fundet' } };
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.bid.updateMany({ where: { projectId: bid.projectId, isSelected: true }, data: { isSelected: false } });
            const selected = await tx.bid.update({
                where: { id: bidId },
                data: { isSelected: true, selectedAt: new Date(), selectedByUserId: jwtUser.sub },
            });
            await tx.project.update({
                where: { id: bid.projectId },
                data: { selectedContractorId: bid.contractorId, currentMilestone: 'CONTRACTOR_SELECTED' },
            });
            return selected;
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: bid.projectId,
            action: 'SELECT_BID',
            newValue: { bidId, contractorId: bid.contractorId, companyName: bid.contractor.companyName },
        });
        const project = await prisma_1.prisma.project.findUnique({ where: { id: bid.projectId }, select: { claimId: true } });
        if (project)
            await (0, notificationService_1.notifyContractorBidSelected)(bid.contractorId, project.claimId);
        return { status: 200, jsonBody: { data: updated } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('bids-select', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'bids/{bidId}/select',
    handler: selectBidHandler,
});
