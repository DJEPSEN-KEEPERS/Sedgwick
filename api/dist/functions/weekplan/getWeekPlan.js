"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getWeekPlanHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        // Load all entreprises for the project, then their week plans
        const entreprises = await prisma_1.prisma.entreprise.findMany({
            where: { projectId, isRelevant: true },
            select: { id: true },
        });
        const entrepriseIds = entreprises.map((e) => e.id);
        const checked = await prisma_1.prisma.entrepriseWeekPlan.findMany({
            where: { entrepriseId: { in: entrepriseIds } },
            select: { entrepriseId: true, isoYear: true, isoWeek: true },
            orderBy: [{ isoYear: 'asc' }, { isoWeek: 'asc' }],
        });
        return { status: 200, jsonBody: { checked } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('weekplan-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/week-plan',
    handler: getWeekPlanHandler,
});
