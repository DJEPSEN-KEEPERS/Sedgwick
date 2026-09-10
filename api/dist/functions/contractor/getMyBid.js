"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getMyBidHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        (0, authMiddleware_1.requireRoles)(jwtUser, 'CONTRACTOR_USER');
        const contractorId = jwtUser.linkedEntityId;
        if (!contractorId)
            return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } };
        const { projectId } = req.params;
        const bid = await prisma_1.prisma.bid.findFirst({
            where: { projectId, contractorId },
            include: { attachments: true },
        });
        if (!bid)
            return { status: 404, jsonBody: { error: 'Intet bud fundet' } };
        return { status: 200, jsonBody: bid };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('contractor-get-my-bid', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'contractor/bids/{projectId}',
    handler: getMyBidHandler,
});
