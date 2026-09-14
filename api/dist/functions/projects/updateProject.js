"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const PROJECT_MILESTONES = [
    'CASE_RECEIVED', 'BIDDING_IN_PROGRESS', 'CONTRACTOR_SELECTED',
    'WORK_SCHEDULED', 'WORK_STARTED', 'WORK_COMPLETED',
    'FINAL_REPORT_SUBMITTED', 'CASE_INVOICED', 'CASE_CLOSED',
];
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
        if (body.currentMilestone !== undefined && !PROJECT_MILESTONES.includes(body.currentMilestone)) {
            return {
                status: 400,
                jsonBody: { error: `Ugyldig sagsfase: '${body.currentMilestone}'. Gyldige værdier er: ${PROJECT_MILESTONES.join(', ')}` },
            };
        }
        const updateData = {};
        const allowedFields = [
            'damageType', 'damageDescription', 'buildingType', 'priorityLevel',
            'maxApprovedPrice', 'estimatedScope', 'slaCategory',
            'address', 'postalCode', 'city', 'region',
            'contactName', 'contactPhone', 'contactEmail',
            'currentMilestone', 'status',
        ];
        // responsibleUserId may be set to null (unassign) or a string (assign)
        if (body.responsibleUserId !== undefined) {
            updateData.responsibleUserId = body.responsibleUserId ?? null;
        }
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
            include: {
                responsibleUser: { select: { id: true, fullName: true, email: true } },
            },
        });
        // Warn in audit log when milestone moves backwards (allowed, but worth tracking)
        if (body.currentMilestone && existing.currentMilestone) {
            const newIdx = PROJECT_MILESTONES.indexOf(body.currentMilestone);
            const oldIdx = PROJECT_MILESTONES.indexOf(existing.currentMilestone);
            if (newIdx !== -1 && oldIdx !== -1 && newIdx < oldIdx) {
                await (0, auditLog_1.writeAuditLog)({
                    userId: jwtUser.sub,
                    entityType: 'Project',
                    entityId: projectId,
                    action: 'MILESTONE_REGRESSION',
                    oldValue: { currentMilestone: existing.currentMilestone, step: oldIdx },
                    newValue: { currentMilestone: body.currentMilestone, step: newIdx },
                });
            }
        }
        // Decrement workload when a case is closed — only on the actual transition to avoid double-counting
        if (body.currentMilestone === 'CASE_CLOSED' &&
            existing.currentMilestone !== 'CASE_CLOSED' &&
            existing.selectedContractorId) {
            await prisma_1.prisma.contractor.updateMany({
                where: { id: existing.selectedContractorId, currentWorkload: { gt: 0 } },
                data: { currentWorkload: { decrement: 1 } },
            });
        }
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
