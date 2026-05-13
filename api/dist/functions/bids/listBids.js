"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listBidsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        const bids = await prisma_1.prisma.bid.findMany({
            where: { projectId },
            include: {
                contractor: {
                    select: {
                        id: true,
                        companyName: true,
                        cvrNumber: true,
                        contactName: true,
                        contactEmail: true,
                        contactPhone: true,
                        sedgwickRatingAvg: true,
                    },
                },
                attachments: true,
                selectedBy: { select: { id: true, fullName: true } },
            },
            orderBy: { submittedAt: 'desc' },
        });
        return { status: 200, jsonBody: bids };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('bids-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/bids',
    handler: listBidsHandler,
});
