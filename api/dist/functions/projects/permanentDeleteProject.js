"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
/**
 * DELETE /projects/{projectId}/permanent
 *
 * Permanently deletes a project and all associated data.
 * Restricted to SEDGWICK_ADMIN only.
 */
async function permanentDeleteProjectHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const existing = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        }
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: projectId,
            action: 'PERMANENT_DELETE',
            oldValue: existing,
        });
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Chat: message attachments → messages → participants → channels
            const channels = await tx.chatChannel.findMany({ where: { projectId }, select: { id: true } });
            const channelIds = channels.map((c) => c.id);
            if (channelIds.length > 0) {
                const messages = await tx.chatMessage.findMany({ where: { channelId: { in: channelIds } }, select: { id: true } });
                const messageIds = messages.map((m) => m.id);
                if (messageIds.length > 0) {
                    await tx.chatMessageAttachment.deleteMany({ where: { messageId: { in: messageIds } } });
                    await tx.chatMessage.deleteMany({ where: { id: { in: messageIds } } });
                }
                await tx.chatChannelParticipant.deleteMany({ where: { channelId: { in: channelIds } } });
                await tx.chatChannel.deleteMany({ where: { id: { in: channelIds } } });
            }
            // 2. Entreprises: week plans → status update attachments → status updates →
            //                 final report attachments → final report answers → final reports → entreprises
            const entreprises = await tx.entreprise.findMany({ where: { projectId }, select: { id: true } });
            const entrepriseIds = entreprises.map((e) => e.id);
            if (entrepriseIds.length > 0) {
                await tx.entrepriseWeekPlan.deleteMany({ where: { entrepriseId: { in: entrepriseIds } } });
                const statusUpdates = await tx.entrepriseStatusUpdate.findMany({
                    where: { entrepriseId: { in: entrepriseIds } }, select: { id: true },
                });
                const updateIds = statusUpdates.map((u) => u.id);
                if (updateIds.length > 0) {
                    await tx.statusUpdateAttachment.deleteMany({ where: { statusUpdateId: { in: updateIds } } });
                    await tx.entrepriseStatusUpdate.deleteMany({ where: { id: { in: updateIds } } });
                }
                const finalReports = await tx.finalReport.findMany({
                    where: { entrepriseId: { in: entrepriseIds } }, select: { id: true },
                });
                const reportIds = finalReports.map((r) => r.id);
                if (reportIds.length > 0) {
                    await tx.finalReportAnswer.deleteMany({ where: { finalReportId: { in: reportIds } } });
                    await tx.finalReportAttachment.deleteMany({ where: { finalReportId: { in: reportIds } } });
                    await tx.finalReport.deleteMany({ where: { id: { in: reportIds } } });
                }
                await tx.entreprise.deleteMany({ where: { id: { in: entrepriseIds } } });
            }
            // 3. Bids: attachments → bids → invitations
            const bids = await tx.bid.findMany({ where: { projectId }, select: { id: true } });
            const bidIds = bids.map((b) => b.id);
            if (bidIds.length > 0) {
                await tx.bidAttachment.deleteMany({ where: { bidId: { in: bidIds } } });
                await tx.bid.deleteMany({ where: { id: { in: bidIds } } });
            }
            await tx.bidInvitation.deleteMany({ where: { projectId } });
            // 4. Reviews
            await tx.contractorReview.deleteMany({ where: { projectId } });
            await tx.clientReview.deleteMany({ where: { projectId } });
            // 5. Project attachments and required skills
            await tx.projectAttachment.deleteMany({ where: { projectId } });
            await tx.projectRequiredSkill.deleteMany({ where: { projectId } });
            // 6. Delete the project itself
            await tx.project.delete({ where: { id: projectId } });
        });
        return { status: 200, jsonBody: { deleted: true } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-permanent-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/permanent',
    handler: permanentDeleteProjectHandler,
});
