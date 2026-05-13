"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function updateEntrepriseStatusHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { entrepriseId } = req.params;
        const body = (await req.json());
        if (!body.milestone || body.progressPercent === undefined) {
            return { status: 400, jsonBody: { error: 'milestone og progressPercent er påkrævet' } };
        }
        const entreprise = await prisma_1.prisma.entreprise.findUnique({ where: { id: entrepriseId } });
        if (!entreprise) {
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        }
        const statusUpdate = await prisma_1.prisma.entrepriseStatusUpdate.create({
            data: {
                entrepriseId,
                submittedByUserId: jwtUser.sub,
                milestone: body.milestone,
                progressPercent: body.progressPercent,
                comments: body.comments,
                startedFlag: body.startedFlag ?? false,
                completedFlag: body.completedFlag ?? false,
                expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : undefined,
                approvalStatus: 'PENDING',
            },
        });
        // SEDGWICK_ADMIN can directly update the entreprise milestone
        if (jwtUser.role === 'SEDGWICK_ADMIN') {
            await prisma_1.prisma.entreprise.update({
                where: { id: entrepriseId },
                data: { currentMilestone: body.milestone },
            });
        }
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'EntrepriseStatusUpdate',
            entityId: statusUpdate.id,
            action: 'CREATE',
            newValue: statusUpdate,
        });
        return { status: 201, jsonBody: statusUpdate };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('entreprises-update-status', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'entreprises/{entrepriseId}/status',
    handler: updateEntrepriseStatusHandler,
});
