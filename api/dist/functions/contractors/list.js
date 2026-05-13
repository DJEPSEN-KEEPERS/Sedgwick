"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listContractorsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const url = new URL(req.url);
        const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50')));
        const search = url.searchParams.get('search') ?? undefined;
        const region = url.searchParams.get('region') ?? undefined;
        const where = {
            ...(search
                ? {
                    OR: [
                        { companyName: { contains: search } },
                        { contactName: { contains: search } },
                        { cvrNumber: { contains: search } },
                    ],
                }
                : {}),
            ...(region ? { regions: { some: { regionName: region } } } : {}),
        };
        const contractors = await prisma_1.prisma.contractor.findMany({
            where,
            include: {
                regions: true,
                skills: { include: { skill: true } },
                certifications: true,
            },
            orderBy: { companyName: 'asc' },
            take: pageSize,
        });
        return { status: 200, jsonBody: contractors };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractors-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractors',
    handler: listContractorsHandler,
});
