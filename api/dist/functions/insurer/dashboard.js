"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function insurerDashboardHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'INSURER_USER');
        const insuranceCompanyId = jwtUser.linkedEntityId;
        if (!insuranceCompanyId) {
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet et forsikringsselskab' } };
        }
        const [active, completed, all, recentProjects] = await Promise.all([
            prisma_1.prisma.project.count({ where: { insuranceCompanyId, status: 'ACTIVE' } }),
            prisma_1.prisma.project.count({ where: { insuranceCompanyId, status: 'COMPLETED' } }),
            prisma_1.prisma.project.findMany({
                where: { insuranceCompanyId },
                select: { requestedDeadline: true, updatedAt: true },
            }),
            prisma_1.prisma.project.findMany({
                where: { insuranceCompanyId },
                include: {
                    selectedContractor: { select: { id: true, companyName: true } },
                    entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: 10,
            }),
        ]);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const delayed = all.filter((p) => p.requestedDeadline && new Date(p.requestedDeadline) < now).length;
        const recentlyUpdated = all.filter((p) => new Date(p.updatedAt) >= sevenDaysAgo).length;
        return {
            status: 200,
            jsonBody: {
                stats: { active, completed, delayed, recentlyUpdated },
                recentProjects,
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('insurer-dashboard', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'insurer/dashboard',
    handler: insurerDashboardHandler,
});
