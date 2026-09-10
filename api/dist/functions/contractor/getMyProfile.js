"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getMyProfileHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const [contractor, user, notificationPrefs] = await Promise.all([
            prisma_1.prisma.contractor.findUnique({
                where: { id: contractorId },
                include: {
                    regions: true,
                    skills: { include: { skill: true } },
                    certifications: true,
                },
            }),
            prisma_1.prisma.user.findUnique({
                where: { id: jwtUser.sub },
                select: { id: true, email: true, fullName: true, phone: true, twoFactorEnabled: true, twoFactorMethod: true },
            }),
            prisma_1.prisma.notificationPreference.findMany({ where: { userId: jwtUser.sub } }),
        ]);
        if (!contractor)
            return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } };
        return { status: 200, jsonBody: { contractor, user, notificationPrefs } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-my-profile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/profile',
    handler: getMyProfileHandler,
});
