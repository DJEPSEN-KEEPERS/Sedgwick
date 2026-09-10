"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const auditLog_1 = require("../../lib/auditLog");
const projectChannel_1 = require("../../lib/projectChannel");
/** Generate a unique claimId: SED-YYYY-XXXXXX */
function generateClaimId() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `SED-${year}-${rand}`;
}
async function createProjectHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const body = (await req.json());
        // Validate required fields
        const required = [
            'insuranceCompanyId', 'damageType', 'damageDescription', 'buildingType',
            'address', 'postalCode', 'city', 'region',
            'contactName', 'contactPhone', 'contactEmail',
        ];
        const missing = required.filter((f) => !body[f]);
        if (missing.length > 0) {
            return { status: 400, jsonBody: { error: `Manglende felter: ${missing.join(', ')}` } };
        }
        // Verify insurance company exists
        const insurer = await prisma_1.prisma.insuranceCompany.findUnique({
            where: { id: body.insuranceCompanyId },
        });
        if (!insurer) {
            return { status: 400, jsonBody: { error: 'Forsikringsselskab ikke fundet' } };
        }
        // Resolve claimId — use provided or auto-generate (with collision retry)
        let claimId = body.claimId?.trim();
        if (claimId) {
            const existing = await prisma_1.prisma.project.findUnique({ where: { claimId } });
            if (existing) {
                return { status: 409, jsonBody: { error: `claimId '${claimId}' er allerede i brug` } };
            }
        }
        else {
            // Auto-generate with up to 5 collision retries
            for (let i = 0; i < 5; i++) {
                const candidate = generateClaimId();
                const exists = await prisma_1.prisma.project.findUnique({ where: { claimId: candidate } });
                if (!exists) {
                    claimId = candidate;
                    break;
                }
            }
            if (!claimId) {
                return { status: 500, jsonBody: { error: 'Kunne ikke generere unikt sag-ID' } };
            }
        }
        const project = await prisma_1.prisma.project.create({
            data: {
                claimId,
                insurerCaseId: body.insurerCaseId ?? '',
                insurancePolicyNumber: body.insurancePolicyNumber ?? '',
                insuranceCompanyId: body.insuranceCompanyId,
                damageType: body.damageType,
                damageDescription: body.damageDescription,
                buildingType: body.buildingType,
                address: body.address,
                postalCode: body.postalCode,
                city: body.city,
                region: body.region,
                gpsLat: body.gpsLat,
                gpsLng: body.gpsLng,
                contactName: body.contactName,
                contactPhone: body.contactPhone,
                contactEmail: body.contactEmail,
                priorityLevel: body.priorityLevel ?? 'NORMAL',
                maxApprovedPrice: body.maxApprovedPrice,
                estimatedScope: body.estimatedScope,
                slaCategory: body.slaCategory,
                requestedStartDate: body.requestedStartDate ? new Date(body.requestedStartDate) : undefined,
                requestedDeadline: body.requestedDeadline ? new Date(body.requestedDeadline) : undefined,
                responsibleUserId: body.responsibleUserId ?? null,
                createdViaApi: false,
            },
            include: {
                insuranceCompany: { select: { id: true, name: true } },
                responsibleUser: { select: { id: true, fullName: true } },
            },
        });
        await (0, auditLog_1.writeAuditLog)({
            userId: jwtUser.sub,
            entityType: 'Project',
            entityId: project.id,
            action: 'CREATE',
            newValue: project,
        });
        // Seed project message thread with the creating admin + all insurer users
        const insurerUsers = await prisma_1.prisma.user.findMany({
            where: { insurerUser: { insuranceCompanyId: body.insuranceCompanyId } },
            select: { id: true },
        });
        await (0, projectChannel_1.ensureProjectChannel)(project.id, [jwtUser.sub, ...insurerUsers.map((u) => u.id)]);
        return { status: 201, jsonBody: project };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('projects-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'projects',
    handler: createProjectHandler,
});
