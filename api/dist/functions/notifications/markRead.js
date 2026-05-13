"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function markReadHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { notificationId } = req.params;
        const notification = await prisma_1.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notification)
            return { status: 404, jsonBody: { error: 'Notifikation ikke fundet' } };
        if (notification.userId !== jwtUser.sub)
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'sent', sentAt: new Date() },
        });
        return { status: 200, jsonBody: { message: 'Markeret som læst' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('notifications-mark-read', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'notifications/{notificationId}/read',
    handler: markReadHandler,
});
