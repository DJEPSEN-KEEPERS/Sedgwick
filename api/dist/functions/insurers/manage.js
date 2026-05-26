"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function createInsurerHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const body = (await req.json());
        if (!body.name?.trim()) {
            return { status: 400, jsonBody: { error: 'Navn er påkrævet' } };
        }
        if (body.externalReference?.trim()) {
            const existing = await prisma_1.prisma.insuranceCompany.findUnique({
                where: { externalReference: body.externalReference.trim() },
            });
            if (existing) {
                return { status: 409, jsonBody: { error: 'Ekstern reference er allerede i brug' } };
            }
        }
        const apiKey = (0, crypto_1.randomBytes)(32).toString('hex');
        const company = await prisma_1.prisma.insuranceCompany.create({
            data: {
                name: body.name.trim(),
                externalReference: body.externalReference?.trim() || null,
                apiKey,
                status: 'active',
            },
            select: { id: true, name: true, externalReference: true, status: true, createdAt: true },
        });
        return { status: 201, jsonBody: company };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
async function updateInsurerHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { insurerId } = req.params;
        const body = (await req.json());
        const existing = await prisma_1.prisma.insuranceCompany.findUnique({ where: { id: insurerId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Forsikringsselskab ikke fundet' } };
        }
        if (body.externalReference?.trim() && body.externalReference.trim() !== existing.externalReference) {
            const conflict = await prisma_1.prisma.insuranceCompany.findUnique({
                where: { externalReference: body.externalReference.trim() },
            });
            if (conflict) {
                return { status: 409, jsonBody: { error: 'Ekstern reference er allerede i brug' } };
            }
        }
        const updated = await prisma_1.prisma.insuranceCompany.update({
            where: { id: insurerId },
            data: {
                ...(body.name?.trim() ? { name: body.name.trim() } : {}),
                ...(body.externalReference !== undefined ? { externalReference: body.externalReference?.trim() || null } : {}),
                ...(body.status ? { status: body.status } : {}),
            },
            select: { id: true, name: true, externalReference: true, status: true, createdAt: true },
        });
        return { status: 200, jsonBody: updated };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
// ── Single registration ───────────────────────────────────────────────────────
functions_1.app.http('insurers-create', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'insurers',
    handler: createInsurerHandler,
});
functions_1.app.http('insurers-update', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'insurers/{insurerId}',
    handler: updateInsurerHandler,
});
