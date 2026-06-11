"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
/**
 * PATCH /auth/2fa
 * Body: { enabled: boolean }
 *
 * Self-service: any logged-in user can toggle their own 2FA.
 * - Disabling: clears twoFactorSecret so no TOTP is needed at next login.
 * - Enabling:  sets twoFactorEnabled=true and clears the old secret so a
 *              fresh TOTP setup is forced on next login.
 */
async function manage2faHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const body = (await req.json());
        if (typeof body.enabled !== 'boolean') {
            return { status: 400, jsonBody: { error: 'enabled (boolean) er påkrævet' } };
        }
        await prisma_1.prisma.user.update({
            where: { id: jwtUser.sub },
            data: {
                twoFactorEnabled: body.enabled,
                // Always clear the secret when toggling — forces fresh TOTP setup on re-enable
                twoFactorSecret: null,
            },
        });
        return {
            status: 200,
            jsonBody: {
                twoFactorEnabled: body.enabled,
                message: body.enabled
                    ? '2FA er aktiveret. Du skal opsætte din authenticator-app ved næste login.'
                    : '2FA er deaktiveret.',
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
/**
 * POST /auth/2fa/reset/{userId}
 *
 * Admin-only: reset another user's 2FA secret (e.g. lost authenticator).
 * Clears twoFactorSecret so fresh TOTP setup is forced on next login.
 */
async function admin2faResetHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { userId } = req.params;
        const target = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, fullName: true },
        });
        if (!target) {
            return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } };
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: null,
                twoFactorEnabled: true, // re-enable in case it was turned off
            },
        });
        return {
            status: 200,
            jsonBody: { message: `2FA nulstillet for ${target.fullName}. Brugeren opsætter ny authenticator ved næste login.` },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
/**
 * POST /auth/confirm-totp-setup
 * Body: { code: string }
 *
 * Confirms a newly scanned TOTP secret for a logged-in user.
 * Verifies the code against the stored (but unconfirmed) secret.
 */
async function confirmTotpSetupHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { code } = (await req.json());
        if (!code || code.length !== 6) {
            return { status: 400, jsonBody: { error: '6-cifret kode er påkrævet' } };
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: jwtUser.sub },
            select: { id: true, twoFactorSecret: true },
        });
        if (!user?.twoFactorSecret) {
            return { status: 400, jsonBody: { error: 'Ingen TOTP-konfiguration at bekræfte' } };
        }
        // Lazy import to avoid circular deps
        const { verifyTotpToken } = await Promise.resolve().then(() => __importStar(require('../../lib/totp')));
        const valid = verifyTotpToken(user.twoFactorSecret, code);
        if (!valid) {
            return { status: 401, jsonBody: { error: 'Forkert kode — tjek din authenticator-app og prøv igen' } };
        }
        // Mark 2FA as confirmed and active
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { twoFactorEnabled: true },
        });
        return { status: 200, jsonBody: { message: '2FA er nu aktiv. Koden accepteret.' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-manage-2fa', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'auth/2fa',
    handler: manage2faHandler,
});
functions_1.app.http('auth-admin-reset-2fa', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/2fa/reset/{userId}',
    handler: admin2faResetHandler,
});
functions_1.app.http('auth-confirm-totp-setup', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/confirm-totp-setup',
    handler: confirmTotpSetupHandler,
});
