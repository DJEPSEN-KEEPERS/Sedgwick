"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function inboxHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const channels = await prisma_1.prisma.chatChannel.findMany({
            where: {
                channelType: 'PROJECT',
                participants: { some: { userId: jwtUser.sub } },
            },
            include: {
                project: {
                    select: { id: true, claimId: true, address: true, city: true, currentMilestone: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { sender: { select: { fullName: true } } },
                },
            },
        });
        const items = channels
            .map((ch) => {
            const latest = ch.messages[0] ?? null;
            return {
                projectId: ch.project.id,
                claimId: ch.project.claimId,
                address: ch.project.address,
                city: ch.project.city,
                currentMilestone: ch.project.currentMilestone,
                latestMessage: latest
                    ? {
                        messageBody: latest.messageBody,
                        senderName: latest.sender.fullName,
                        createdAt: latest.createdAt.toISOString(),
                    }
                    : null,
            };
        })
            .sort((a, b) => {
            if (!a.latestMessage && !b.latestMessage)
                return 0;
            if (!a.latestMessage)
                return 1;
            if (!b.latestMessage)
                return -1;
            return new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime();
        });
        return { status: 200, jsonBody: { items } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('messages-inbox', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'messages/inbox',
    handler: inboxHandler,
});
