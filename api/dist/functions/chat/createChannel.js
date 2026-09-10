"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function createChannelHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const body = await req.json();
        if (!body.projectId || !body.channelType || !body.name) {
            return { status: 400, jsonBody: { error: 'projectId, channelType og name er påkrævet' } };
        }
        const allParticipantIds = [...new Set([jwtUser.sub, ...(body.participantUserIds ?? [])])];
        const channel = await prisma_1.prisma.chatChannel.create({
            data: {
                projectId: body.projectId,
                channelType: body.channelType,
                name: body.name,
                createdByUserId: jwtUser.sub,
                participants: {
                    create: allParticipantIds.map((userId) => ({ userId })),
                },
            },
            include: { participants: true },
        });
        return { status: 201, jsonBody: { data: channel } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-create-channel', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'chat/channels',
    handler: createChannelHandler,
});
