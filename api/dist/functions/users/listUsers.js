"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listUsersHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true,
            },
            orderBy: { fullName: 'asc' },
        });
        return { status: 200, jsonBody: users };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('users-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users',
    handler: listUsersHandler,
});
