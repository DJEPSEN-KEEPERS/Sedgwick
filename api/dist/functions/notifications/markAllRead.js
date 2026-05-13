"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function markAllReadHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        await prisma_1.prisma.notification.updateMany({
            where: { userId: jwtUser.sub, status: 'pending' },
            data: { status: 'sent', sentAt: new Date() },
        });
        return { status: 200, jsonBody: { message: 'Alle notifikationer markeret som læst' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('notifications-mark-all-read', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'notifications/mark-all-read',
    handler: markAllReadHandler,
});
