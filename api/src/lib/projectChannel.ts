import { prisma as defaultPrisma } from './prisma'

export async function ensureProjectChannel(
  projectId: string,
  participantUserIds: string[],
  tx?: any,
): Promise<{ id: string }> {
  const db = tx ?? defaultPrisma
  const uniqueIds = [...new Set(participantUserIds.filter(Boolean))]

  const existing = await db.chatChannel.findFirst({
    where: { projectId, channelType: 'PROJECT' },
    select: { id: true, participants: { select: { userId: true } } },
  })

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
    })
    return channel
  }

  const existingIds = new Set(existing.participants.map((p: any) => p.userId))
  for (const userId of uniqueIds) {
    if (!existingIds.has(userId)) {
      await db.chatChannelParticipant.create({
        data: { channelId: existing.id, userId },
      })
    }
  }

  return { id: existing.id }
}
