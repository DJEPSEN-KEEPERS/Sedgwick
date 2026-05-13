"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function createContractorHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const body = await req.json();
        if (!body.companyName || !body.cvrNumber || !body.contactName || !body.contactEmail) {
            return { status: 400, jsonBody: { error: 'companyName, cvrNumber, contactName og contactEmail er påkrævet' } };
        }
        const existing = await prisma_1.prisma.contractor.findUnique({ where: { cvrNumber: body.cvrNumber } });
        if (existing)
            return { status: 409, jsonBody: { error: 'CVR-nummer er allerede registreret' } };
        const contractor = await prisma_1.prisma.contractor.create({
            data: {
                companyName: body.companyName,
                cvrNumber: body.cvrNumber,
                contactName: body.contactName,
                contactEmail: body.contactEmail,
                contactPhone: body.contactPhone ?? '',
                maxParallelProjects: body.maxParallelProjects ?? 5,
                regions: body.regions?.length
                    ? { create: body.regions.map((r) => ({ regionName: r })) }
                    : undefined,
            },
            include: { regions: true },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Contractor',
            entityId: contractor.id,
            action: 'CREATE',
            newValue: { companyName: contractor.companyName, cvrNumber: contractor.cvrNumber },
        });
        return { status: 201, jsonBody: { data: contractor } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractors-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'contractors',
    handler: createContractorHandler,
});
