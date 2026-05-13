"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getPreferencesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const prefs = await prisma_1.prisma.notificationPreference.findMany({
            where: { userId: jwtUser.sub },
        });
        return { status: 200, jsonBody: prefs };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
async function updatePreferencesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const body = await req.json();
        await Promise.all(body.map((pref) => prisma_1.prisma.notificationPreference.upsert({
            where: {
                id: `${jwtUser.sub}-${pref.channel}-${pref.eventType}`,
            },
            update: { enabled: pref.enabled },
            create: {
                userId: jwtUser.sub,
                channel: pref.channel,
                eventType: pref.eventType,
                enabled: pref.enabled,
            },
        })));
        return { status: 200, jsonBody: { message: 'Præferencer opdateret' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('notifications-prefs-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'notifications/preferences',
    handler: getPreferencesHandler,
});
functions_1.app.http('notifications-prefs-put', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'notifications/preferences',
    handler: updatePreferencesHandler,
});
