"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function handler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Ingen håndværker tilknyttet brugeren' } };
        const team = await prisma_1.prisma.contractorUser.findMany({
            where: { contractorId },
            include: { user: { select: { id: true, fullName: true, email: true } } },
        });
        const members = team.map((t) => t.user).sort((a, b) => a.fullName.localeCompare(b.fullName, 'da'));
        return { status: 200, jsonBody: members };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-my-team', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/my-team',
    handler,
});
