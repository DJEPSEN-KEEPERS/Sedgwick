"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
async function listProjectsPublicHandler(req, context) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
            return { status: 401, jsonBody: { error: 'Ugyldig API-nøgle' } };
        }
        const insurer = await prisma_1.prisma.insuranceCompany.findFirst({ where: { apiKey } });
        if (!insurer)
            return { status: 401, jsonBody: { error: 'Ukendt API-nøgle' } };
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
        const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') ?? '20'));
        const status = url.searchParams.get('status') ?? undefined;
        const where = { insuranceCompanyId: insurer.id, ...(status ? { status } : {}) };
        const [total, projects] = await Promise.all([
            prisma_1.prisma.project.count({ where }),
            prisma_1.prisma.project.findMany({
                where,
                select: {
                    id: true,
                    claimId: true,
                    insurerCaseId: true,
                    currentMilestone: true,
                    status: true,
                    progressPercent: true,
                    address: true,
                    postalCode: true,
                    city: true,
                    damageType: true,
                    createdAt: true,
                    updatedAt: true,
                    requestedDeadline: true,
                    finalCompletionDate: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return { status: 200, jsonBody: { data: projects, total, page, pageSize } };
    }
    catch (err) {
        context.error(err);
        return { status: 500, jsonBody: { error: 'Intern serverfejl' } };
    }
}
functions_1.app.http('public-list-projects', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'public/cases',
    handler: listProjectsPublicHandler,
});
