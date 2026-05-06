import { prisma } from './prisma'

interface AuditEntry {
  userId?: string
  entityType: string
  entityId: string
  action: string
  oldValue?: unknown
  newValue?: unknown
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValueJson: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      newValueJson: entry.newValue ? JSON.stringify(entry.newValue) : null,
    },
  })
}
