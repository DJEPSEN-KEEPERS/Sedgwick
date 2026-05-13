"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function meHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: jwtUser.sub },
            include: {
                insurerUser: true,
                contractorUser: true,
            },
        });
        if (!user || user.status !== 'ACTIVE') {
            return { status: 401, jsonBody: { error: 'Bruger ikke fundet eller inaktiv' } };
        }
        const linkedEntityId = user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null;
        return {
            status: 200,
            jsonBody: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                twoFactorEnabled: user.twoFactorEnabled,
                twoFactorMethod: user.twoFactorMethod,
                lastLoginAt: user.lastLoginAt,
                linkedEntityId,
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-me', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/me',
    handler: meHandler,
});
