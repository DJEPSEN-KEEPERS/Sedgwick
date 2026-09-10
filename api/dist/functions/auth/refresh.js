"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("../../lib/jwt");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function refreshHandler(req, context) {
    try {
        const body = (await req.json());
        if (!body.refreshToken) {
            return { status: 400, jsonBody: { error: 'refreshToken er påkrævet' } };
        }
        let decoded;
        try {
            decoded = (0, jwt_1.verifyRefreshToken)(body.refreshToken);
        }
        catch {
            return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet refresh token' } };
        }
        if (decoded.type !== 'refresh') {
            return { status: 401, jsonBody: { error: 'Ugyldig token type' } };
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.sub },
            include: {
                insurerUser: true,
                contractorUser: true,
            },
        });
        if (!user || user.status !== 'ACTIVE') {
            return { status: 401, jsonBody: { error: 'Bruger ikke fundet eller inaktiv' } };
        }
        const linkedEntityId = user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null;
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            email: user.email,
            role: user.role,
            linkedEntityId,
        });
        return {
            status: 200,
            jsonBody: {
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    phone: user.phone,
                    twoFactorEnabled: user.twoFactorEnabled,
                    twoFactorMethod: user.twoFactorMethod,
                    linkedEntityId,
                },
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-refresh', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/refresh',
    handler: refreshHandler,
});
