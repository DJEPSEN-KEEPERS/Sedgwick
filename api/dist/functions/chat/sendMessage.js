"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function sendMessageHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { channelId } = req.params;
        const payload = await req.json();
        if (!payload.messageBody?.trim()) {
            return { status: 400, jsonBody: { error: 'Beskedtekst er påkrævet' } };
        }
        const participant = await prisma_1.prisma.chatChannelParticipant.findFirst({
            where: { channelId, userId: jwtUser.sub },
        });
        if (!participant)
            return { status: 403, jsonBody: { error: 'Ingen adgang til denne kanal' } };
        const message = await prisma_1.prisma.chatMessage.create({
            data: {
                channelId,
                senderUserId: jwtUser.sub,
                messageBody: payload.messageBody.trim(),
            },
            include: { sender: { select: { id: true, fullName: true, role: true } } },
        });
        return { status: 201, jsonBody: message };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-send-message', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'channels/{channelId}/messages',
    handler: sendMessageHandler,
});
