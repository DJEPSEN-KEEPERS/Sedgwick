"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function toggleWeekPlanHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER', 'SEDGWICK_ADMIN');
        const { entrepriseId } = req.params;
        const body = (await req.json());
        if (!body.isoYear || !body.isoWeek) {
            return { status: 400, jsonBody: { error: 'isoYear og isoWeek er påkrævet' } };
        }
        const entreprise = await prisma_1.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
            include: { project: { select: { id: true, selectedContractorId: true } } },
        });
        if (!entreprise)
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        if (jwtUser.role === 'CONTRACTOR_USER') {
            const isEntrepriseContractor = entreprise.contractorId === jwtUser.linkedEntityId;
            const isProjectContractor = entreprise.project?.selectedContractorId === jwtUser.linkedEntityId;
            if (!isEntrepriseContractor && !isProjectContractor) {
                return { status: 403, jsonBody: { error: 'Ingen adgang' } };
            }
        }
        const existing = await prisma_1.prisma.entrepriseWeekPlan.findUnique({
            where: { entrepriseId_isoYear_isoWeek: { entrepriseId, isoYear: body.isoYear, isoWeek: body.isoWeek } },
        });
        if (existing) {
            await prisma_1.prisma.entrepriseWeekPlan.delete({ where: { id: existing.id } });
            return { status: 200, jsonBody: { active: false } };
        }
        else {
            await prisma_1.prisma.entrepriseWeekPlan.create({
                data: { entrepriseId, isoYear: body.isoYear, isoWeek: body.isoWeek },
            });
            return { status: 200, jsonBody: { active: true } };
        }
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('weekplan-toggle', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'entreprises/{entrepriseId}/week-plan',
    handler: toggleWeekPlanHandler,
});
