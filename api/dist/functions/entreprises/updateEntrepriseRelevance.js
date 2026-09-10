"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
async function updateEntrepriseRelevanceHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { entrepriseId } = req.params;
        const body = (await req.json());
        if (typeof body.isRelevant !== 'boolean') {
            return { status: 400, jsonBody: { error: 'isRelevant (boolean) er påkrævet' } };
        }
        const existing = await prisma_1.prisma.entreprise.findUnique({ where: { id: entrepriseId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } };
        }
        const updated = await prisma_1.prisma.entreprise.update({
            where: { id: entrepriseId },
            data: {
                isRelevant: body.isRelevant,
                markedRelevantBy: 'sedgwick',
            },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Entreprise',
            entityId: entrepriseId,
            action: 'UPDATE_RELEVANCE',
            oldValue: { isRelevant: existing.isRelevant, markedRelevantBy: existing.markedRelevantBy },
            newValue: { isRelevant: updated.isRelevant, markedRelevantBy: updated.markedRelevantBy },
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('entreprises-update-relevance', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'entreprises/{entrepriseId}/relevance',
    handler: updateEntrepriseRelevanceHandler,
});
