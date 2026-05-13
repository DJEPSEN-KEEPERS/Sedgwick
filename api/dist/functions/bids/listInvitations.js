"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listInvitationsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN', 'CONTRACTOR_USER');
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        const where = jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
            ? { projectId, contractorId: jwtUser.linkedEntityId }
            : { projectId };
        const invitations = await prisma_1.prisma.bidInvitation.findMany({
            where,
            include: {
                contractor: {
                    select: {
                        id: true,
                        companyName: true,
                        cvrNumber: true,
                        contactName: true,
                        contactEmail: true,
                        contactPhone: true,
                        sedgwickRatingAvg: true,
                        regions: true,
                        skills: { include: { skill: true } },
                    },
                },
                invitedBy: { select: { id: true, fullName: true } },
                bid: true,
            },
            orderBy: { invitedAt: 'desc' },
        });
        return { status: 200, jsonBody: invitations };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('invitations-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/invitations',
    handler: listInvitationsHandler,
});
