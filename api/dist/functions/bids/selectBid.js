"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
const projectChannel_1 = require("../../lib/projectChannel");
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
        // Load all invitations and competing bids before the transaction
        const allInvitations = await prisma_1.prisma.bidInvitation.findMany({
            where: { projectId: bid.projectId },
            include: { bid: { select: { id: true, contractorId: true } } },
        });
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
            await tx.contractor.update({
                where: { id: bid.contractorId },
                data: { currentWorkload: { increment: 1 } },
            });
            // Close all open invitations that are not the winner's
            const openStatuses = ['PENDING', 'INTERESTED'];
            await tx.bidInvitation.updateMany({
                where: {
                    projectId: bid.projectId,
                    contractorId: { not: bid.contractorId },
                    status: { in: openStatuses },
                },
                data: { status: 'CLOSED_CONTRACTOR_SELECTED' },
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
        if (project) {
            const claimId = project.claimId;
            // Notify winner
            await (0, notificationService_1.notifyContractorBidSelected)(bid.contractorId, claimId);
            // Notify contractors with non-selected bids and contractors who accepted but didn't bid
            const notifyPromises = [];
            for (const inv of allInvitations) {
                if (inv.contractorId === bid.contractorId)
                    continue;
                if (inv.bid) {
                    // Had a competing bid
                    notifyPromises.push((0, notificationService_1.notifyContractorBidNotSelected)(inv.contractorId, claimId));
                }
                else if (inv.status === 'INTERESTED') {
                    // Accepted the invitation but never submitted a bid
                    notifyPromises.push((0, notificationService_1.notifyContractorInvitationClosed)(inv.contractorId, claimId));
                }
                // PENDING invitations get no notification — they never showed interest
            }
            await Promise.all(notifyPromises);
        }
        // Add the contractor's users to the project message thread
        const contractorUsers = await prisma_1.prisma.user.findMany({
            where: { contractorUser: { contractorId: bid.contractorId } },
            select: { id: true },
        });
        if (contractorUsers.length > 0) {
            await (0, projectChannel_1.ensureProjectChannel)(bid.projectId, contractorUsers.map((u) => u.id));
        }
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
