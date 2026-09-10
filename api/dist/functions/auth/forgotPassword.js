"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
const email_1 = require("../../lib/email");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function forgotPasswordHandler(req, context) {
    try {
        const { email } = (await req.json());
        if (!email?.trim()) {
            return { status: 400, jsonBody: { error: 'E-mail er påkrævet' } };
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, fullName: true, status: true },
        });
        // Always return 200 — never reveal whether an e-mail exists (security)
        if (!user || user.status !== 'ACTIVE') {
            return { status: 200, jsonBody: { message: 'Hvis e-mailen findes, er der sendt et link.' } };
        }
        // Invalidate previous unused tokens for this user
        await prisma_1.prisma.passwordResetToken.deleteMany({
            where: { userId: user.id, usedAt: null },
        });
        // Create new token — expires in 1 hour
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma_1.prisma.passwordResetToken.create({
            data: { token, userId: user.id, expiresAt },
        });
        const APP_URL = process.env.APP_URL ?? 'https://black-mud-094afdb03.azurestaticapps.net';
        const resetUrl = `${APP_URL}/reset-password?token=${token}`;
        (0, email_1.sendPasswordResetEmail)({ toEmail: user.email, fullName: user.fullName, resetUrl });
        return { status: 200, jsonBody: { message: 'Hvis e-mailen findes, er der sendt et link.' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-forgot-password', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/forgot-password',
    handler: forgotPasswordHandler,
});
