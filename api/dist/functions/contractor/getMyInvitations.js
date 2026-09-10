"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getMyInvitationsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const invitations = await prisma_1.prisma.bidInvitation.findMany({
            where: { contractorId },
            include: {
                project: {
                    select: {
                        id: true,
                        claimId: true,
                        address: true,
                        city: true,
                        region: true,
                        damageType: true,
                        priorityLevel: true,
                        requestedDeadline: true,
                        buildingType: true,
                        estimatedScope: true,
                        entreprises: { select: { id: true, type: true, isRelevant: true } },
                        insuranceCompany: { select: { name: true } },
                        attachments: {
                            where: { isClientVisible: true },
                            select: { id: true, fileName: true, fileType: true, blobUrl: true },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
                bid: { select: { id: true, bidAmount: true, submittedAt: true, isSelected: true } },
            },
            orderBy: { invitedAt: 'desc' },
        });
        return { status: 200, jsonBody: invitations };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-my-invitations', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/invitations',
    handler: getMyInvitationsHandler,
});
