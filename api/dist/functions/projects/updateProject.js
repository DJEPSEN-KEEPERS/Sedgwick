"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function updateProjectHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const body = (await req.json());
        const existing = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        }
        const updateData = {};
        const allowedFields = [
            'damageDescription', 'priorityLevel', 'maxApprovedPrice', 'estimatedScope',
            'slaCategory', 'contactName', 'contactPhone', 'contactEmail',
            'currentMilestone', 'status',
        ];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }
        if (body.requestedStartDate !== undefined) {
            updateData.requestedStartDate = body.requestedStartDate ? new Date(body.requestedStartDate) : null;
        }
        if (body.requestedDeadline !== undefined) {
            updateData.requestedDeadline = body.requestedDeadline ? new Date(body.requestedDeadline) : null;
        }
        if (body.finalCompletionDate !== undefined) {
            updateData.finalCompletionDate = body.finalCompletionDate ? new Date(body.finalCompletionDate) : null;
        }
        const updated = await prisma_1.prisma.project.update({
            where: { id: projectId },
            data: updateData,
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: projectId,
            action: 'UPDATE',
            oldValue: existing,
            newValue: updated,
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-update', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}',
    handler: updateProjectHandler,
});
