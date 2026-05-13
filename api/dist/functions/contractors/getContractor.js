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
                sedgwickReviews: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                clientReviews: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });
        if (!contractor)
            return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } };
        return { status: 200, jsonBody: { data: contractor } };
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
