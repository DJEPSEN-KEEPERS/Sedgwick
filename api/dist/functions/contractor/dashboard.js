"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function contractorDashboardHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const [activeJobs, pendingInvitations, awaitingBid, unreadMessages] = await Promise.all([
            prisma_1.prisma.project.count({
                where: {
                    selectedContractorId: contractorId,
                    status: 'ACTIVE',
                },
            }),
            prisma_1.prisma.bidInvitation.count({
                where: { contractorId, status: 'PENDING' },
            }),
            prisma_1.prisma.bidInvitation.count({
                where: { contractorId, status: 'INTERESTED', bid: null },
            }),
            prisma_1.prisma.chatMessage.count({
                where: {
                    channel: {
                        project: { selectedContractorId: contractorId },
                    },
                    createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
                },
            }),
        ]);
        return {
            status: 200,
            jsonBody: {
                stats: { activeJobs, pendingInvitations, awaitingBid, unreadMessages },
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-dashboard', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/dashboard',
    handler: contractorDashboardHandler,
});
