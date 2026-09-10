"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const projectChannel_1 = require("../../lib/projectChannel");
async function getProjectThreadHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, insuranceCompanyId: true, selectedContractorId: true },
        });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        if (jwtUser.role === 'CONTRACTOR_USER' && project.selectedContractorId !== jwtUser.linkedEntityId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        const channel = await (0, projectChannel_1.ensureProjectChannel)(projectId, [jwtUser.sub]);
        const messages = await prisma_1.prisma.chatMessage.findMany({
            where: { channelId: channel.id },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, fullName: true, role: true } },
                attachments: true,
            },
        });
        return { status: 200, jsonBody: { channelId: channel.id, messages } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-get-project-thread', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/thread',
    handler: getProjectThreadHandler,
});
