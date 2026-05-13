"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function logoutHandler(req, context) {
    try {
        // Attempt to extract user for audit log — not required
        try {
            const jwtUser = (0, authMiddleware_1.authenticate)(req);
            await (0, auditLog_1.writeAuditLog)({
                userId: jwtUser.sub,
                entityType: 'User',
                entityId: jwtUser.sub,
                action: 'LOGOUT',
            });
        }
        catch {
            // token may be expired — still return success
        }
        return { status: 200, jsonBody: { message: 'Logget ud' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('auth-logout', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/logout',
    handler: logoutHandler,
});
