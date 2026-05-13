"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const prisma_1 = require("./prisma");
async function writeAuditLog(entry) {
    await prisma_1.prisma.auditLog.create({
        data: {
            userId: entry.userId,
            entityType: entry.entityType,
            entityId: entry.entityId,
            action: entry.action,
            oldValueJson: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
            newValueJson: entry.newValue ? JSON.stringify(entry.newValue) : null,
        },
    });
}
