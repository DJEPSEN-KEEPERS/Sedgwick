"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function reopenProjectHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const existing = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        }
        if (existing.status !== 'CLOSED') {
            return { status: 409, jsonBody: { error: 'Projektet er ikke lukket og kan ikke genåbnes' } };
        }
        // Restore status to ACTIVE. currentMilestone is left unchanged — it already reflects
        // the phase the project had reached before it was closed, which is the honest state.
        const updated = await prisma_1.prisma.project.update({
            where: { id: projectId },
            data: { status: 'ACTIVE' },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: projectId,
            action: 'REOPEN',
            oldValue: { status: existing.status },
            newValue: { status: 'ACTIVE', currentMilestone: existing.currentMilestone },
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-reopen', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/reopen',
    handler: reopenProjectHandler,
});
