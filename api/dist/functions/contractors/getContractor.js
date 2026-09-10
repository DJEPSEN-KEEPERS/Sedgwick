"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getContractorHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN', 'CONTRACTOR_USER');
        const { contractorId } = req.params;
        const targetId = jwtUser.role === 'CONTRACTOR_USER' ? jwtUser.linkedEntityId : contractorId;
        const contractor = await prisma_1.prisma.contractor.findUnique({
            where: { id: targetId },
            include: {
                regions: true,
                skills: { include: { skill: true } },
                certifications: true,
                users: {
                    include: {
                        user: { select: { id: true, fullName: true, email: true, role: true, status: true } },
                    },
                },
                sedgwickReviews: { orderBy: { createdAt: 'desc' }, take: 20 },
                clientReviews: { orderBy: { createdAt: 'desc' }, take: 20 },
                // Project history via bid invitations
                bidInvitations: {
                    include: {
                        project: { select: { id: true, claimId: true } },
                        bid: { select: { isSelected: true, bidAmount: true } },
                    },
                    orderBy: { invitedAt: 'desc' },
                    take: 100,
                },
            },
        });
        if (!contractor)
            return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } };
        // ── Flatten / transform for frontend consumption ──────────────────────────
        // regions: ContractorRegion[] → string[]
        const regions = contractor.regions.map((r) => r.regionName);
        // skills: ContractorSkill[] (with nested skill) → { id, name }[]
        const skills = contractor.skills.map((cs) => ({
            id: cs.skill.id,
            name: cs.skill.name,
        }));
        // projectHistory: BidInvitation[] → ProjectHistory[]
        const projectHistory = contractor.bidInvitations.map((inv) => ({
            projectId: inv.project.id,
            claimId: inv.project.claimId,
            role: inv.bid?.isSelected ? 'selected' : 'invited',
            bidStatus: inv.bid
                ? (inv.bid.isSelected ? 'VALGT' : 'INDSENDT')
                : (inv.status === 'INTERESTED' ? 'INTERESSERET' : inv.status === 'NOT_INTERESTED' ? 'IKKE INTERESSERET' : 'AFVENTER'),
            outcome: inv.bid?.isSelected ? 'Valgt som håndværker' : undefined,
            date: inv.invitedAt.toISOString(),
        }));
        // Return bare object (no { data: ... } wrapper) so frontend can use directly
        return {
            status: 200,
            jsonBody: {
                ...contractor,
                regions,
                skills,
                projectHistory,
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractors-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractors/{contractorId}',
    handler: getContractorHandler,
});
