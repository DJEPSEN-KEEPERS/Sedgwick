"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const ALLOWED = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
async function handler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Ingen håndværker tilknyttet brugeren' } };
        const { entrepriseId } = req.params;
        const { milestone } = (await req.json());
        if (!ALLOWED.includes(milestone)) {
            return { status: 400, jsonBody: { error: 'Ugyldig status. Gyldige værdier: NOT_STARTED, IN_PROGRESS, COMPLETED' } };
        }
        const entreprise = await prisma_1.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
            include: { project: { select: { id: true, selectedContractorId: true } } },
        });
        if (!entreprise)
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        const projectId = entreprise.project.id;
        const isSelected = entreprise.project.selectedContractorId === contractorId;
        if (!isSelected) {
            const hasBid = await prisma_1.prisma.bid.findFirst({ where: { projectId, contractorId } });
            const hasInvitation = await prisma_1.prisma.bidInvitation.findFirst({ where: { projectId, contractorId } });
            if (!hasBid && !hasInvitation) {
                return { status: 403, jsonBody: { error: 'Ingen adgang til denne entreprise' } };
            }
        }
        const updated = await prisma_1.prisma.entreprise.update({
            where: { id: entrepriseId },
            data: { currentMilestone: milestone },
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-update-entreprise-milestone', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'contractor/entreprises/{entrepriseId}/milestone',
    handler,
});
