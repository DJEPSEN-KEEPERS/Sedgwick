"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function updateUserHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { userId } = req.params;
        const body = (await req.json());
        const existing = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } };
        }
        // Guard: cannot edit own account's status (prevent self-lockout)
        if (userId === jwtUser.sub && body.status && body.status !== 'ACTIVE') {
            return { status: 400, jsonBody: { error: 'Du kan ikke ændre din egen status' } };
        }
        // Email uniqueness check
        if (body.email?.trim() && body.email.trim().toLowerCase() !== existing.email) {
            const taken = await prisma_1.prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
            if (taken) {
                return { status: 409, jsonBody: { error: 'E-mail er allerede i brug' } };
            }
        }
        const updateData = {};
        if (body.fullName?.trim())
            updateData.fullName = body.fullName.trim();
        if (body.email?.trim())
            updateData.email = body.email.trim().toLowerCase();
        if (body.phone !== undefined)
            updateData.phone = body.phone?.trim() || null;
        if (body.status)
            updateData.status = body.status;
        if (body.password?.trim())
            updateData.passwordHash = await bcryptjs_1.default.hash(body.password.trim(), 12);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true, fullName: true, email: true, phone: true, role: true,
                status: true, createdAt: true, lastLoginAt: true,
                insurerUser: { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
                contractorUser: { select: { contractorId: true, contractor: { select: { companyName: true } } } },
            },
        });
        // Update association if provided
        if (existing.role === 'INSURER_USER' && body.insuranceCompanyId) {
            await prisma_1.prisma.insuranceCompanyUser.upsert({
                where: { userId },
                update: { insuranceCompanyId: body.insuranceCompanyId },
                create: { userId, insuranceCompanyId: body.insuranceCompanyId },
            });
        }
        if (existing.role === 'CONTRACTOR_USER' && body.contractorId) {
            await prisma_1.prisma.contractorUser.upsert({
                where: { userId },
                update: { contractorId: body.contractorId },
                create: { userId, contractorId: body.contractorId },
            });
        }
        // Re-fetch to return fresh association data
        const fresh = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, fullName: true, email: true, phone: true, role: true,
                status: true, createdAt: true, lastLoginAt: true,
                insurerUser: { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
                contractorUser: { select: { contractorId: true, contractor: { select: { companyName: true } } } },
            },
        });
        return { status: 200, jsonBody: fresh };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
// ── DELETE /users/{userId} ────────────────────────────────────────────────────
async function deleteUserHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const { userId } = req.params;
        if (userId === jwtUser.sub) {
            return { status: 400, jsonBody: { error: 'Du kan ikke slette din egen konto' } };
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } };
        }
        // Attempt clean deletion in a transaction:
        // 1. Nullify responsibleUserId on projects
        // 2. Delete notification preferences and notifications
        // 3. Delete audit logs for this user
        // 4. Delete InsuranceCompanyUser / ContractorUser links
        // 5. Delete the user itself
        //
        // If the user has chat messages, status updates, bids etc. the delete
        // will fail with a FK constraint — we return 409 so the UI can offer
        // deactivation instead.
        try {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.project.updateMany({
                    where: { responsibleUserId: userId },
                    data: { responsibleUserId: null },
                }),
                prisma_1.prisma.notificationPreference.deleteMany({ where: { userId } }),
                prisma_1.prisma.notification.deleteMany({ where: { userId } }),
                prisma_1.prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } }),
                ...(existing.role === 'INSURER_USER'
                    ? [prisma_1.prisma.insuranceCompanyUser.deleteMany({ where: { userId } })]
                    : []),
                ...(existing.role === 'CONTRACTOR_USER'
                    ? [prisma_1.prisma.contractorUser.deleteMany({ where: { userId } })]
                    : []),
                prisma_1.prisma.user.delete({ where: { id: userId } }),
            ]);
            return { status: 200, jsonBody: { deleted: true } };
        }
        catch {
            // FK constraint — user has data (chat messages, bids, status updates, etc.)
            return {
                status: 409,
                jsonBody: {
                    error: 'Brugeren har tilknyttede data og kan ikke slettes permanent',
                    canDeactivate: true,
                },
            };
        }
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
// ── Registration ──────────────────────────────────────────────────────────────
functions_1.app.http('users-update', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'users/{userId}',
    handler: updateUserHandler,
});
functions_1.app.http('users-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'users/{userId}',
    handler: deleteUserHandler,
});
