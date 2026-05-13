"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listEntreprisesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        // Insurer scope check
        if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        const where = jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
            ? { projectId, contractorId: jwtUser.linkedEntityId }
            : { projectId };
        const entreprises = await prisma_1.prisma.entreprise.findMany({
            where,
            include: {
                contractor: { select: { id: true, companyName: true, contactName: true, contactPhone: true } },
                statusUpdates: {
                    orderBy: { createdAt: 'desc' },
                    include: { submittedBy: { select: { id: true, fullName: true } }, attachments: true },
                },
                finalReport: { include: { answers: true, attachments: true } },
            },
            orderBy: { type: 'asc' },
        });
        return { status: 200, jsonBody: entreprises };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('entreprises-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/entreprises',
    handler: listEntreprisesHandler,
});
