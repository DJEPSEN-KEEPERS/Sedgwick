"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
// ── GET /users ────────────────────────────────────────────────────────────────
async function listUsersHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true,
                insurerUser: { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
                contractorUser: { select: { contractorId: true, contractor: { select: { companyName: true } } } },
            },
            orderBy: { fullName: 'asc' },
        });
        return { status: 200, jsonBody: users };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
async function createUserHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'SEDGWICK_ADMIN');
        const body = (await req.json());
        if (!body.fullName || !body.email || !body.role || !body.password) {
            return { status: 400, jsonBody: { error: 'fullName, email, role og password er påkrævet' } };
        }
        if (!['SEDGWICK_ADMIN', 'INSURER_USER', 'CONTRACTOR_USER'].includes(body.role)) {
            return { status: 400, jsonBody: { error: 'Ugyldig rolle' } };
        }
        if (body.role === 'INSURER_USER' && !body.insuranceCompanyId) {
            return { status: 400, jsonBody: { error: 'insuranceCompanyId er påkrævet for forsikringsbrugere' } };
        }
        if (body.role === 'CONTRACTOR_USER' && !body.contractorId) {
            return { status: 400, jsonBody: { error: 'contractorId er påkrævet for håndværkerbrugere' } };
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
        if (existing) {
            return { status: 409, jsonBody: { error: 'E-mail er allerede i brug' } };
        }
        const passwordHash = await bcryptjs_1.default.hash(body.password, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: body.email.toLowerCase().trim(),
                fullName: body.fullName.trim(),
                role: body.role,
                passwordHash,
                phone: body.phone?.trim() ?? null,
                twoFactorEnabled: false,
                status: 'ACTIVE',
            },
        });
        if (body.role === 'INSURER_USER' && body.insuranceCompanyId) {
            await prisma_1.prisma.insuranceCompanyUser.create({
                data: { userId: user.id, insuranceCompanyId: body.insuranceCompanyId },
            });
        }
        else if (body.role === 'CONTRACTOR_USER' && body.contractorId) {
            await prisma_1.prisma.contractorUser.create({
                data: { userId: user.id, contractorId: body.contractorId },
            });
        }
        return {
            status: 201,
            jsonBody: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
            },
        };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
// ── Single registration for both methods ──────────────────────────────────────
functions_1.app.http('users', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'users',
    handler: (req, ctx) => req.method === 'POST' ? createUserHandler(req, ctx) : listUsersHandler(req, ctx),
});
