"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
async function getProjectPublicHandler(req, context) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
            return { status: 401, jsonBody: { error: 'Ugyldig API-nøgle' } };
        }
        const insurer = await prisma_1.prisma.insuranceCompany.findFirst({ where: { apiKey } });
        if (!insurer)
            return { status: 401, jsonBody: { error: 'Ukendt API-nøgle' } };
        const { claimId } = req.params;
        const project = await prisma_1.prisma.project.findFirst({
            where: { claimId, insuranceCompanyId: insurer.id },
            select: {
                id: true,
                claimId: true,
                insurerCaseId: true,
                insurancePolicyNumber: true,
                currentMilestone: true,
                status: true,
                progressPercent: true,
                address: true,
                postalCode: true,
                city: true,
                region: true,
                buildingType: true,
                damageType: true,
                damageDescription: true,
                contactName: true,
                contactEmail: true,
                contactPhone: true,
                requestedStartDate: true,
                requestedDeadline: true,
                finalCompletionDate: true,
                createdAt: true,
                updatedAt: true,
                selectedContractor: { select: { companyName: true } },
                entreprises: {
                    select: {
                        type: true,
                        currentMilestone: true,
                        progressPercent: true,
                        isRelevant: true,
                    },
                },
            },
        });
        if (!project)
            return { status: 404, jsonBody: { error: 'Sag ikke fundet' } };
        return { status: 200, jsonBody: { data: project } };
    }
    catch (err) {
        context.error(err);
        return { status: 500, jsonBody: { error: 'Intern serverfejl' } };
    }
}
functions_1.app.http('public-get-project', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'public/cases/{claimId}',
    handler: getProjectPublicHandler,
});
