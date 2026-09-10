"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function submitFinalReportHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const { entrepriseId } = req.params;
        const body = await req.json();
        const entreprise = await prisma_1.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
            select: { id: true, contractorId: true, project: { select: { selectedContractorId: true } } },
        });
        if (!entreprise)
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
            return { status: 403, jsonBody: { error: 'Ingen adgang' } };
        }
        const existing = await prisma_1.prisma.finalReport.findUnique({ where: { entrepriseId } });
        if (existing)
            return { status: 409, jsonBody: { error: 'Slutrapport er allerede indsendt for denne entreprise' } };
        const report = await prisma_1.prisma.finalReport.create({
            data: {
                entrepriseId,
                contractorId,
                submittedByUserId: jwtUser.sub,
                summary: body.summary,
                submittedAt: new Date(),
                answers: {
                    create: (body.answers ?? []).map((a) => ({
                        questionKey: a.questionKey,
                        questionLabel: a.questionLabel,
                        answerValue: a.answerValue,
                    })),
                },
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
            include: { answers: true, attachments: true },
        });
        // Advance entreprise milestone
        await prisma_1.prisma.entreprise.update({
            where: { id: entrepriseId },
            data: { currentMilestone: 'COMPLETED', progressPercent: 100 },
        });
        return { status: 201, jsonBody: report };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-submit-final-report', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'contractor/entreprises/{entrepriseId}/final-report',
    handler: submitFinalReportHandler,
});
