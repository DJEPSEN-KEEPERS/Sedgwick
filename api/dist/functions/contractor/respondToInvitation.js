"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function respondToInvitationHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const { invitationId } = req.params;
        const body = await req.json();
        if (!['INTERESTED', 'NOT_INTERESTED'].includes(body.status)) {
            return { status: 400, jsonBody: { error: 'Ugyldig status' } };
        }
        const invitation = await prisma_1.prisma.bidInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation)
            return { status: 404, jsonBody: { error: 'Invitation ikke fundet' } };
        if (invitation.contractorId !== contractorId)
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        if (invitation.status !== 'PENDING')
            return { status: 409, jsonBody: { error: 'Invitationen er allerede besvaret' } };
        const updated = await prisma_1.prisma.bidInvitation.update({
            where: { id: invitationId },
            data: { status: body.status, respondedAt: new Date() },
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-respond-invitation', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'contractor/invitations/{invitationId}/respond',
    handler: respondToInvitationHandler,
});
