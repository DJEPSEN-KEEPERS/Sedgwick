"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
// Public REST API for insurance company systems to create cases
async function ingestHandler(req, context) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (!apiKey) {
            return { status: 401, jsonBody: { error: 'API key required' } };
        }
        const insurer = await prisma_1.prisma.insuranceCompany.findUnique({ where: { apiKey } });
        if (!insurer || insurer.status !== 'active') {
            return { status: 401, jsonBody: { error: 'Invalid API key' } };
        }
        const body = await req.json();
        const required = ['claimId', 'insurerCaseId', 'insurancePolicyNumber', 'damageType',
            'damageDescription', 'buildingType', 'address', 'postalCode', 'city', 'region',
            'contactName', 'contactPhone', 'contactEmail'];
        const missing = required.filter((f) => !body[f]);
        if (missing.length > 0) {
            return { status: 400, jsonBody: { error: `Missing fields: ${missing.join(', ')}` } };
        }
        const existing = await prisma_1.prisma.project.findUnique({
            where: { claimId: body.claimId },
        });
        if (existing) {
            return { status: 409, jsonBody: { error: 'Project with this claimId already exists', id: existing.id } };
        }
        const project = await prisma_1.prisma.project.create({
            data: {
                claimId: body.claimId,
                insurerCaseId: body.insurerCaseId,
                insurancePolicyNumber: body.insurancePolicyNumber,
                insuranceCompanyId: insurer.id,
                damageType: body.damageType,
                damageDescription: body.damageDescription,
                priorityLevel: body.priorityLevel ?? 'NORMAL',
                buildingType: body.buildingType,
                address: body.address,
                postalCode: body.postalCode,
                city: body.city,
                region: body.region,
                gpsLat: body.gpsLat,
                gpsLng: body.gpsLng,
                maxApprovedPrice: body.maxApprovedPrice,
                estimatedScope: body.estimatedScope,
                slaCategory: body.slaCategory,
                contactName: body.contactName,
                contactPhone: body.contactPhone,
                contactEmail: body.contactEmail,
                createdViaApi: true,
            },
        });
        return { status: 201, jsonBody: { id: project.id, claimId: project.claimId } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('public-ingest', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'public/cases',
    handler: ingestHandler,
});
