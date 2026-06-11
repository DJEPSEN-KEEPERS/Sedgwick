"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
/**
 * DELETE /projects/{projectId}
 *
 * Soft-closes the project (status → CLOSED) rather than a hard delete,
 * preserving the full audit trail and all linked records (bids, chat, reports).
 * Hard delete is intentionally not supported via API.
 */
async function deleteProjectHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const existing = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        }
        if (existing.status === 'CLOSED') {
            return { status: 409, jsonBody: { error: 'Projektet er allerede lukket' } };
        }
        const updated = await prisma_1.prisma.project.update({
            where: { id: projectId },
            data: { status: 'CLOSED' },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: projectId,
            action: 'DELETE',
            oldValue: existing,
            newValue: updated,
        });
        return { status: 200, jsonBody: { deleted: true, status: 'CLOSED' } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}',
    handler: deleteProjectHandler,
});
