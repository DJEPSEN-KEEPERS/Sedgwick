"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listChannelsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const url = new URL(req.url);
        const projectId = url.searchParams.get('projectId') ?? undefined;
        const channels = await prisma_1.prisma.chatChannel.findMany({
            where: {
                ...(projectId ? { projectId } : {}),
                participants: { some: { userId: jwtUser.sub } },
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, messageBody: true, createdAt: true },
                },
                _count: { select: { messages: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return { status: 200, jsonBody: { data: channels } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-list-channels', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'chat/channels',
    handler: listChannelsHandler,
});
