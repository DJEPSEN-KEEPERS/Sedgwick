"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listPendingHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const [rawUpdates, rawReports] = await Promise.all([
            prisma_1.prisma.entrepriseStatusUpdate.findMany({
                where: { approvalStatus: 'PENDING' },
                include: {
                    entreprise: {
                        include: {
                            project: { select: { id: true, claimId: true, address: true, city: true } },
                            contractor: { select: { companyName: true } },
                        },
                    },
                    attachments: true,
                },
                orderBy: { createdAt: 'asc' },
            }),
            prisma_1.prisma.finalReport.findMany({
                where: { approvalStatus: 'PENDING' },
                include: {
                    entreprise: {
                        include: {
                            project: { select: { id: true, claimId: true, address: true, city: true } },
                            contractor: { select: { companyName: true } },
                        },
                    },
                    submittedBy: { select: { id: true, fullName: true } },
                    answers: true,
                    attachments: true,
                },
                orderBy: { submittedAt: 'asc' },
            }),
        ]);
        const statusUpdates = rawUpdates.map((u) => ({
            id: u.id,
            projectId: u.entreprise.project.id,
            projectClaimId: u.entreprise.project.claimId,
            entrepriseType: u.entreprise.type,
            contractorName: u.entreprise.contractor?.companyName ?? '—',
            milestone: u.milestone,
            progressPercent: u.progressPercent,
            comments: u.comments ?? undefined,
            attachments: u.attachments.map((a) => ({
                id: a.id,
                fileName: a.fileName,
                fileType: a.fileType,
                blobUrl: a.blobUrl,
            })),
            submittedAt: u.createdAt.toISOString(),
        }));
        const finalReports = rawReports.map((r) => ({
            id: r.id,
            projectId: r.entreprise.project.id,
            projectClaimId: r.entreprise.project.claimId,
            entrepriseType: r.entreprise.type,
            contractorName: r.entreprise.contractor?.companyName ?? '—',
            summary: r.summary ?? undefined,
            answers: r.answers.map((a) => ({ questionLabel: a.questionLabel, answerValue: a.answerValue })),
            attachments: r.attachments.map((a) => ({
                id: a.id,
                fileName: a.fileName,
                fileType: a.fileType,
                blobUrl: a.blobUrl,
            })),
            submittedAt: (r.submittedAt ?? r.createdAt).toISOString(),
        }));
        return { status: 200, jsonBody: { statusUpdates, finalReports } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('approvals-list-pending', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'approvals/pending',
    handler: listPendingHandler,
});
