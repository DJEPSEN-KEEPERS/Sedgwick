"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function updateContractorHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { contractorId } = req.params;
        const body = await req.json();
        const existing = await prisma_1.prisma.contractor.findUnique({ where: { id: contractorId } });
        if (!existing)
            return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } };
        const { regions, ...fields } = body;
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            if (regions !== undefined) {
                await tx.contractorRegion.deleteMany({ where: { contractorId } });
                if (regions.length > 0) {
                    await tx.contractorRegion.createMany({
                        data: regions.map((r) => ({ contractorId, regionName: r })),
                    });
                }
            }
            return tx.contractor.update({
                where: { id: contractorId },
                data: fields,
                include: { regions: true, skills: { include: { skill: true } } },
            });
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Contractor',
            entityId: contractorId,
            action: 'UPDATE',
            oldValue: { companyName: existing.companyName, status: existing.status },
            newValue: fields,
        });
        return { status: 200, jsonBody: { data: updated } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractors-update', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'contractors/{contractorId}',
    handler: updateContractorHandler,
});
