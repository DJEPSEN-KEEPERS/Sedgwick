"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const recommendationEngine_1 = require("../../lib/recommendationEngine");
async function getRecommendationsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const results = await (0, recommendationEngine_1.getRecommendations)(projectId);
        // Enrich with contractor details and normalize breakdown field names for frontend
        const contractorIds = results.map((r) => r.contractorId);
        const contractors = await prisma_1.prisma.contractor.findMany({
            where: { id: { in: contractorIds } },
            include: { regions: true, skills: { include: { skill: true } }, certifications: true },
        });
        const contractorMap = new Map(contractors.map((c) => [c.id, c]));
        const enriched = results.map((r) => ({
            contractorId: r.contractorId,
            companyName: r.companyName,
            totalScore: r.totalScore,
            matchReasons: r.matchReasons,
            breakdown: {
                regionScore: r.breakdown.regionMatch,
                skillScore: r.breakdown.skillMatch,
                ratingScore: r.breakdown.ratingScore,
                workloadScore: -r.breakdown.workloadPenalty,
            },
            contractor: contractorMap.get(r.contractorId) ?? null,
        }));
        return { status: 200, jsonBody: enriched };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-recommendations', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/recommendations',
    handler: getRecommendationsHandler,
});
