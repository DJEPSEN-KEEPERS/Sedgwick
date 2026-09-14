"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function cancelInvitationHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { invitationId } = req.params;
        const invitation = await prisma_1.prisma.bidInvitation.findUnique({
            where: { id: invitationId },
            include: { bid: { select: { id: true, isSelected: true } } },
        });
        if (!invitation) {
            return { status: 404, jsonBody: { error: 'Invitation ikke fundet' } };
        }
        if (invitation.bid) {
            if (invitation.bid.isSelected) {
                return { status: 409, jsonBody: { error: 'Invitationen kan ikke annulleres - tilbuddet er allerede valgt for denne sag.' } };
            }
            return { status: 409, jsonBody: { error: 'Invitationen kan ikke annulleres - håndværkeren har allerede afgivet et tilbud. Slet eller afvis tilbuddet først.' } };
        }
        await prisma_1.prisma.bidInvitation.delete({ where: { id: invitationId } });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'BidInvitation',
            entityId: invitationId,
            action: 'DELETE',
            oldValue: invitation,
        });
        return { status: 200, jsonBody: { message: 'Invitation annulleret' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('invitations-cancel', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'invitations/{invitationId}',
    handler: cancelInvitationHandler,
});
