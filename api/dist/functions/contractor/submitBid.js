"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function submitBidHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const body = await req.json();
        if (!body.projectId || !body.bidAmount) {
            return { status: 400, jsonBody: { error: 'projectId og bidAmount er påkrævet' } };
        }
        const invitation = await prisma_1.prisma.bidInvitation.findFirst({
            where: { projectId: body.projectId, contractorId, status: 'INTERESTED' },
        });
        if (!invitation) {
            return { status: 404, jsonBody: { error: 'Ingen aktiv invitation fundet for denne sag' } };
        }
        const existingBid = await prisma_1.prisma.bid.findUnique({ where: { bidInvitationId: invitation.id } });
        if (existingBid) {
            return { status: 409, jsonBody: { error: 'Du har allerede afgivet et bud på denne sag' } };
        }
        const bid = await prisma_1.prisma.bid.create({
            data: {
                projectId: body.projectId,
                contractorId,
                bidInvitationId: invitation.id,
                bidAmount: body.bidAmount,
                currency: 'DKK',
                comments: body.comments,
            },
        });
        // Update entreprise relevance if provided
        if (body.entrepriseRelevance) {
            const updates = Object.entries(body.entrepriseRelevance).map(([entrepriseId, isRelevant]) => prisma_1.prisma.entreprise.updateMany({
                where: { id: entrepriseId, projectId: body.projectId },
                data: { isRelevant, markedRelevantBy: contractorId },
            }));
            await Promise.all(updates);
        }
        return { status: 201, jsonBody: bid };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-submit-bid', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'contractor/bids',
    handler: submitBidHandler,
});
