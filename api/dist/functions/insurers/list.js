"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listInsurersHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const companies = await prisma_1.prisma.insuranceCompany.findMany({
            select: { id: true, name: true, externalReference: true, status: true },
            orderBy: { name: 'asc' },
        });
        return { status: 200, jsonBody: companies };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('insurers-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'insurers',
    handler: listInsurersHandler,
});
