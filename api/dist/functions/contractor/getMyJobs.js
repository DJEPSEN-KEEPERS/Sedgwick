"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getMyJobsHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const jobs = await prisma_1.prisma.project.findMany({
            where: { selectedContractorId: contractorId },
            include: {
                insuranceCompany: { select: { id: true, name: true } },
                entreprises: {
                    where: { contractorId },
                    select: {
                        id: true,
                        type: true,
                        currentMilestone: true,
                        progressPercent: true,
                        scheduledStart: true,
                        scheduledEnd: true,
                        isRelevant: true,
                    },
                },
            },
            orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        });
        return { status: 200, jsonBody: jobs };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-my-jobs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/jobs',
    handler: getMyJobsHandler,
});
