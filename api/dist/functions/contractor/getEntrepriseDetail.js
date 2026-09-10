"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getEntrepriseDetailHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const { entrepriseId } = req.params;
        const entreprise = await prisma_1.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
            include: {
                project: {
                    select: {
                        id: true,
                        claimId: true,
                        address: true,
                        city: true,
                        contactName: true,
                        contactPhone: true,
                        selectedContractorId: true,
                    },
                },
                statusUpdates: {
                    orderBy: { createdAt: 'desc' },
                    include: { attachments: true },
                },
                finalReport: {
                    include: { answers: true, attachments: true },
                },
            },
        });
        if (!entreprise)
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang til denne entreprise' } };
        }
        return { status: 200, jsonBody: entreprise };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-entreprise-detail', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/entreprises/{entrepriseId}',
    handler: getEntrepriseDetailHandler,
});
