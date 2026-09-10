"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * TEMPORARY diagnostic endpoint — remove after debugging.
 * GET /api/auth/debug-token
 * Returns info about the Authorization header and JWT verification.
 */
const functions_1 = require("@azure/functions");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
functions_1.app.http('auth-debug-token', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/debug-token',
    handler: async (req) => {
        const customToken = req.headers.get('x-auth-token') ?? req.headers.get('X-Auth-Token') ?? '';
        const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
        const token = customToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
        const secret = process.env.JWT_SECRET ?? '';
        const secretHint = secret
            ? `${secret.slice(0, 4)}...${secret.slice(-4)} (len=${secret.length})`
            : '(not set)';
        let decoded = null;
        let verifyError = null;
        let verifyOk = false;
        // Decode without verification (just base64)
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                }
            }
            catch {
                decoded = null;
            }
        }
        // Attempt full verification
        if (token && secret) {
            try {
                jsonwebtoken_1.default.verify(token, secret);
                verifyOk = true;
            }
            catch (e) {
                verifyError = e instanceof Error ? e.message : String(e);
            }
        }
        return {
            status: 200,
            jsonBody: {
                hasAuthHeader: !!authHeader,
                tokenPresent: !!token,
                tokenFirstChars: token ? token.slice(0, 20) + '…' : null,
                secretHint,
                decoded,
                verifyOk,
                verifyError,
            },
        };
    },
});
