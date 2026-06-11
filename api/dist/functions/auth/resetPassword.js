"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function resetPasswordHandler(req, context) {
    try {
        const { token, password } = (await req.json());
        if (!token?.trim()) {
            return { status: 400, jsonBody: { error: 'Token mangler' } };
        }
        if (!password || password.length < 8) {
            return { status: 400, jsonBody: { error: 'Adgangskoden skal være mindst 8 tegn' } };
        }
        const record = await prisma_1.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: { select: { id: true, email: true, status: true } } },
        });
        if (!record) {
            return { status: 400, jsonBody: { error: 'Ugyldigt eller udløbet link' } };
        }
        if (record.usedAt) {
            return { status: 400, jsonBody: { error: 'Dette link er allerede brugt' } };
        }
        if (record.expiresAt < new Date()) {
            return { status: 400, jsonBody: { error: 'Linket er udløbet — anmod om et nyt' } };
        }
        if (record.user.status !== 'ACTIVE') {
            return { status: 403, jsonBody: { error: 'Kontoen er deaktiveret' } };
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Update password, clear TOTP secret (forces fresh setup on next login),
        // and mark token used — all in one transaction
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: record.userId },
                data: {
                    passwordHash,
                    twoFactorSecret: null, // cleared → fresh TOTP setup on next login
                    twoFactorEnabled: true, // keep enforcement on
                },
            }),
            prisma_1.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            }),
        ]);
        return { status: 200, jsonBody: { message: 'Adgangskoden er opdateret. Du kan nu logge ind.' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-reset-password', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/reset-password',
    handler: resetPasswordHandler,
});
