"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("../../lib/jwt");
const auditLog_1 = require("../../lib/auditLog");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function loginHandler(req, context) {
    try {
        const body = (await req.json());
        if (!body.email || !body.password) {
            return { status: 400, jsonBody: { error: 'E-mail og adgangskode er påkrævet' } };
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: body.email.toLowerCase().trim() },
            include: {
                insurerUser: { include: { insuranceCompany: true } },
                contractorUser: true,
            },
        });
        if (!user) {
            // Constant-time comparison to prevent timing attacks
            await bcryptjs_1.default.compare(body.password, '$2b$12$invalidhashtopreventtiming');
            return { status: 401, jsonBody: { error: 'Ugyldige loginoplysninger' } };
        }
        if (user.status !== 'ACTIVE') {
            return { status: 403, jsonBody: { error: 'Konto er deaktiveret' } };
        }
        const passwordValid = await bcryptjs_1.default.compare(body.password, user.passwordHash);
        if (!passwordValid) {
            await (0, auditLog_1.writeAuditLog)({
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                action: 'LOGIN_FAILED',
            });
            return { status: 401, jsonBody: { error: 'Ugyldige loginoplysninger' } };
        }
        // Only require 2FA if it has been configured
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            const linkedEntityId = user.insurerUser?.insuranceCompanyId ?? user.contractorUser?.contractorId ?? null;
            const accessToken = (0, jwt_1.signAccessToken)({ sub: user.id, email: user.email, role: user.role, linkedEntityId });
            const refreshToken = (0, jwt_1.signRefreshToken)(user.id);
            await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
            await (0, auditLog_1.writeAuditLog)({ userId: user.id, entityType: 'User', entityId: user.id, action: 'LOGIN_SUCCESS' });
            return {
                status: 200,
                jsonBody: {
                    requiresTwoFactor: false,
                    accessToken,
                    refreshToken,
                    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone, twoFactorEnabled: user.twoFactorEnabled, twoFactorMethod: user.twoFactorMethod, linkedEntityId },
                },
            };
        }
        const tempToken = (0, jwt_1.signTempToken)(user.id);
        await (0, auditLog_1.writeAuditLog)({
            userId: user.id,
            entityType: 'User',
            entityId: user.id,
            action: 'LOGIN_STEP1_OK',
        });
        return {
            status: 200,
            jsonBody: {
                requiresTwoFactor: true,
                tempToken,
                twoFactorMethod: user.twoFactorMethod,
                message: '2FA-kode krævet',
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: loginHandler,
});
