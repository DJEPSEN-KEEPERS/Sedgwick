"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function projectAuditLogHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const logs = await prisma_1.prisma.auditLog.findMany({
            where: { entityId: projectId, entityType: 'Project' },
            include: { user: { select: { id: true, fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const formatted = logs.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            user: log.user,
            oldValue: log.oldValueJson ? JSON.parse(log.oldValueJson) : null,
            newValue: log.newValueJson ? JSON.parse(log.newValueJson) : null,
            createdAt: log.createdAt.toISOString(),
        }));
        return { status: 200, jsonBody: formatted };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-audit-log', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/audit',
    handler: projectAuditLogHandler,
});
