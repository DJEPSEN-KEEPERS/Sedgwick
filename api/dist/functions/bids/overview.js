"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function bidsOverviewHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const [awaitingInvitations, receivedBids, recentDecisions] = await Promise.all([
            prisma_1.prisma.bidInvitation.findMany({
                where: { status: 'PENDING' },
                include: {
                    project: { select: { id: true, claimId: true } },
                    contractor: { select: { companyName: true } },
                },
                orderBy: { invitedAt: 'desc' },
                take: 20,
            }),
            prisma_1.prisma.bid.findMany({
                where: { isSelected: false },
                include: {
                    project: { select: { id: true, claimId: true } },
                    contractor: { select: { companyName: true } },
                },
                orderBy: { submittedAt: 'desc' },
                take: 20,
            }),
            prisma_1.prisma.bid.findMany({
                where: { isSelected: true },
                include: {
                    project: { select: { id: true, claimId: true } },
                    contractor: { select: { companyName: true } },
                },
                orderBy: { selectedAt: 'desc' },
                take: 10,
            }),
        ]);
        return {
            status: 200,
            jsonBody: {
                awaitingResponse: awaitingInvitations.map((i) => ({
                    id: i.id,
                    projectId: i.project.id,
                    claimId: i.project.claimId,
                    contractorName: i.contractor.companyName,
                    invitedAt: i.invitedAt.toISOString(),
                })),
                bidsReceived: receivedBids.map((b) => ({
                    id: b.id,
                    projectId: b.project.id,
                    claimId: b.project.claimId,
                    contractorName: b.contractor.companyName,
                    bidAmount: b.bidAmount,
                    currency: b.currency,
                    submittedAt: b.submittedAt.toISOString(),
                })),
                recentDecisions: recentDecisions.map((b) => ({
                    id: b.id,
                    projectId: b.project.id,
                    claimId: b.project.claimId,
                    contractorName: b.contractor.companyName,
                    bidAmount: b.bidAmount,
                    currency: b.currency,
                    selectedAt: b.selectedAt.toISOString(),
                })),
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('bids-overview', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'bids/overview',
    handler: bidsOverviewHandler,
});
