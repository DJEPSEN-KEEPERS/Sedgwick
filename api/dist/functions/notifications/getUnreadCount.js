"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getUnreadCountHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const count = await prisma_1.prisma.notification.count({
            where: { userId: jwtUser.sub, status: 'pending' },
        });
        return { status: 200, jsonBody: { count } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('notifications-unread-count', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'notifications/unread-count',
    handler: getUnreadCountHandler,
});
