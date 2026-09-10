"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("../../lib/jwt");
const totp_1 = require("../../lib/totp");
const auditLog_1 = require("../../lib/auditLog");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function verify2faHandler(req, context) {
    try {
        const body = (await req.json());
        if (!body.tempToken || !body.code) {
            return { status: 400, jsonBody: { error: 'tempToken og code er påkrævet' } };
        }
        let decoded;
        try {
            decoded = (0, jwt_1.verifyTempToken)(body.tempToken);
        }
        catch {
            return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet temp token' } };
        }
        if (decoded.type !== 'temp_2fa') {
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
        // Verify TOTP
        if (user.twoFactorMethod === 'TOTP') {
            if (!user.twoFactorSecret) {
                return { status: 400, jsonBody: { error: '2FA ikke konfigureret' } };
            }
            const valid = (0, totp_1.verifyTotpToken)(user.twoFactorSecret, body.code);
            if (!valid) {
                await (0, auditLog_1.writeAuditLog)({
                    userId: user.id,
                    entityType: 'User',
                    entityId: user.id,
                    action: '2FA_FAILED',
                });
                return { status: 401, jsonBody: { error: 'Ugyldig 2FA-kode' } };
            }
        }
        // SMS verification would go here when enabled
        // Build linked entity id
        const linkedEntityId = user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null;
        const accessToken = (0, jwt_1.signAccessToken)({
            sub: user.id,
            email: user.email,
            role: user.role,
            linkedEntityId,
        });
        const refreshToken = (0, jwt_1.signRefreshToken)(user.id);
        // Update last login
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: user.id,
            entityType: 'User',
            entityId: user.id,
            action: 'LOGIN_SUCCESS',
        });
        return {
            status: 200,
            jsonBody: {
                accessToken,
                refreshToken,
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
functions_1.app.http('auth-verify-2fa', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/verify-2fa',
    handler: verify2faHandler,
});
