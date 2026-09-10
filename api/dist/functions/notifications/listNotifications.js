"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listNotificationsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId: jwtUser.sub },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return { status: 200, jsonBody: notifications };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('notifications-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'notifications',
    handler: listNotificationsHandler,
});
