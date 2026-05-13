"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listProjectChannelsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        const channelTypeFilter = jwtUser.role === 'INSURER_USER' ? { channelType: 'SEDGWICK_INSURER' } : {};
        const channels = await prisma_1.prisma.chatChannel.findMany({
            where: {
                projectId,
                ...channelTypeFilter,
                participants: { some: { userId: jwtUser.sub } },
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, messageBody: true, createdAt: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return { status: 200, jsonBody: channels };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('chat-list-project-channels', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/channels',
    handler: listProjectChannelsHandler,
});
