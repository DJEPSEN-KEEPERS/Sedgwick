"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function submitStatusUpdateHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const { entrepriseId } = req.params;
        const body = await req.json();
        if (!body.milestone || body.progressPercent == null) {
            return { status: 400, jsonBody: { error: 'milestone og progressPercent er påkrævet' } };
        }
        const entreprise = await prisma_1.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
            select: { id: true, contractorId: true, project: { select: { selectedContractorId: true } } },
        });
        if (!entreprise)
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        const update = await prisma_1.prisma.entrepriseStatusUpdate.create({
            data: {
                entrepriseId,
                submittedByUserId: jwtUser.sub,
                milestone: body.milestone,
                progressPercent: body.progressPercent,
                startedFlag: body.startedFlag ?? false,
                completedFlag: body.completedFlag ?? false,
                expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : undefined,
                comments: body.comments,
                attachments: body.attachmentUrls?.length
                    ? {
                        create: body.attachmentUrls.map((a) => ({
                            fileName: a.fileName,
                            fileType: a.fileType,
                            blobUrl: a.blobUrl,
                            fileSizeMb: a.fileSizeMb,
                        })),
                    }
                    : undefined,
            },
            include: { attachments: true },
        });
        // Keep entreprise milestone and progress in sync
        await prisma_1.prisma.entreprise.update({
            where: { id: entrepriseId },
            data: {
                currentMilestone: body.milestone,
                progressPercent: body.progressPercent,
                actualStart: body.startedFlag ? new Date() : undefined,
                actualEnd: body.completedFlag ? new Date() : undefined,
            },
        });
        return { status: 201, jsonBody: update };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-submit-status-update', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'contractor/entreprises/{entrepriseId}/status-updates',
    handler: submitStatusUpdateHandler,
});
