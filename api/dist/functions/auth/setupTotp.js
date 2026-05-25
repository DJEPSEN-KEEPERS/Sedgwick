"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const jwt_1 = require("../../lib/jwt");
const totp_1 = require("../../lib/totp");
async function setupTotpHandler(req, context) {
    try {
        // Accept either Authorization header (full access token) or tempToken in body (first-time setup)
        let userId;
        const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
        const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (headerToken) {
            // Logged-in user resetting TOTP
            try {
                userId = (0, jwt_1.verifyAccessToken)(headerToken).sub;
            }
            catch {
                return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet token' } };
            }
        }
        else {
            // First-time setup via tempToken in body
            const body = await req.json().catch(() => ({}));
            const bodyToken = body.tempToken ?? '';
            if (!bodyToken)
                return { status: 401, jsonBody: { error: 'Mangler token' } };
            try {
                const decoded = (0, jwt_1.verifyTempToken)(bodyToken);
                if (decoded.type !== 'temp_2fa') {
                    return { status: 401, jsonBody: { error: 'Ugyldig token type' } };
                }
                userId = decoded.sub;
            }
            catch {
                return { status: 401, jsonBody: { error: 'Ugyldig eller udløbet token' } };
            }
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } };
        const secret = (0, totp_1.generateTotpSecret)();
        const encryptedSecret = (0, totp_1.encryptSecret)(secret);
        const uri = (0, totp_1.generateTotpUri)(secret, user.email);
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(uri);
        // Store encrypted secret (not yet active until confirmed)
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: encryptedSecret },
        });
        return {
            status: 200,
            jsonBody: {
                qrCode: qrCodeDataUrl,
                manualKey: secret,
                message: 'Scan QR-koden i din authenticator-app og bekræft',
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-setup-totp', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/setup-totp',
    handler: setupTotpHandler,
});
