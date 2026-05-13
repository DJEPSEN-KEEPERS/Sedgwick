"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listFilesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const url = new URL(req.url);
        const clientVisibleParam = url.searchParams.get('clientVisible');
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        if (jwtUser.role === 'INSURER_USER') {
            if (project.insuranceCompanyId !== jwtUser.linkedEntityId) {
                return { status: 403, jsonBody: { error: 'Ingen adgang' } };
            }
        }
        const where = { projectId };
        if (jwtUser.role === 'INSURER_USER' || clientVisibleParam === 'true') {
            where.isClientVisible = true;
        }
        const files = await prisma_1.prisma.projectAttachment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return { status: 200, jsonBody: { files } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('files-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/files',
    handler: listFilesHandler,
});
