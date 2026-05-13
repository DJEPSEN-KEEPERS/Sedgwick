"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listProjectsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const url = new URL(req.url);
        const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
        const status = url.searchParams.get('status') ?? undefined;
        const search = url.searchParams.get('search') ?? undefined;
        const where = jwtUser.role === 'INSURER_USER' && jwtUser.linkedEntityId
            ? { insuranceCompanyId: jwtUser.linkedEntityId, ...(status ? { status } : {}) }
            : jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
                ? { selectedContractorId: jwtUser.linkedEntityId, ...(status ? { status } : {}) }
                : status
                    ? { status }
                    : {};
        const projects = await prisma_1.prisma.project.findMany({
            where,
            include: {
                insuranceCompany: { select: { id: true, name: true } },
                selectedContractor: { select: { id: true, companyName: true } },
                entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: pageSize,
            ...(search
                ? {
                    where: {
                        ...where,
                        OR: [
                            { claimId: { contains: search } },
                            { address: { contains: search } },
                            { city: { contains: search } },
                            { damageType: { contains: search } },
                        ],
                    },
                }
                : {}),
        });
        return { status: 200, jsonBody: projects };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects',
    handler: listProjectsHandler,
});
