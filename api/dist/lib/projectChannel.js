"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureProjectChannel = ensureProjectChannel;
const prisma_1 = require("./prisma");
async function ensureProjectChannel(projectId, participantUserIds, tx) {
    const db = tx ?? prisma_1.prisma;
    const uniqueIds = [...new Set(participantUserIds.filter(Boolean))];
    const existing = await db.chatChannel.findFirst({
        where: { projectId, channelType: 'PROJECT' },
        select: { id: true, participants: { select: { userId: true } } },
    });
    if (!existing) {
        const channel = await db.chatChannel.create({
            data: {
                projectId,
                channelType: 'PROJECT',
                name: 'Sagstråd',
                createdByUserId: uniqueIds[0] ?? 'system',
                participants: {
                    create: uniqueIds.map((userId) => ({ userId })),
                },
            },
            select: { id: true },
        });
        return channel;
    }
    const existingIds = new Set(existing.participants.map((p) => p.userId));
    for (const userId of uniqueIds) {
        if (!existingIds.has(userId)) {
            await db.chatChannelParticipant.create({
                data: { channelId: existing.id, userId },
            });
        }
    }
    return { id: existing.id };
}
