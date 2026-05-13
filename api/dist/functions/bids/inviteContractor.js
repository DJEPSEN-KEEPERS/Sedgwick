"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const notificationService_1 = require("../../lib/notificationService");
async function inviteContractorHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const body = (await req.json());
        if (!body.contractorId) {
            return { status: 400, jsonBody: { error: 'contractorId er påkrævet' } };
        }
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        }
        const contractor = await prisma_1.prisma.contractor.findUnique({ where: { id: body.contractorId } });
        if (!contractor) {
            return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } };
        }
        const existing = await prisma_1.prisma.bidInvitation.findFirst({
            where: { projectId, contractorId: body.contractorId },
        });
        if (existing) {
            return { status: 409, jsonBody: { error: 'Håndværkeren er allerede inviteret til dette projekt' } };
        }
        const invitation = await prisma_1.prisma.bidInvitation.create({
            data: {
                projectId,
                contractorId: body.contractorId,
                invitedByUserId: jwtUser.sub,
                status: 'PENDING',
            },
            include: {
                contractor: { select: { id: true, companyName: true } },
                invitedBy: { select: { id: true, fullName: true } },
            },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'BidInvitation',
            entityId: invitation.id,
            action: 'CREATE',
            newValue: { projectId, contractorId: body.contractorId },
        });
        await (0, notificationService_1.notifyNewInvitation)(body.contractorId, project.claimId);
        return { status: 201, jsonBody: invitation };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('invitations-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/invite',
    handler: inviteContractorHandler,
});
