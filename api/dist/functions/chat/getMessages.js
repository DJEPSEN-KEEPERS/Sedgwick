"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getMessagesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { channelId } = req.params;
        const url = new URL(req.url);
        const before = url.searchParams.get('before') ?? undefined;
        const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '50'));
        const participant = await prisma_1.prisma.chatChannelParticipant.findFirst({
            where: { channelId, userId: jwtUser.sub },
        });
        if (!participant)
            return { status: 403, jsonBody: { error: 'Ingen adgang til denne kanal' } };
        const messages = await prisma_1.prisma.chatMessage.findMany({
            where: {
                channelId,
                ...(before ? { createdAt: { lt: new Date(before) } } : {}),
            },
            include: {
                sender: { select: { id: true, fullName: true, role: true } },
                attachments: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return { status: 200, jsonBody: messages.reverse() };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-get-messages', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'channels/{channelId}/messages',
    handler: getMessagesHandler,
});
