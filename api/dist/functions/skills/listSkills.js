"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function listSkillsHandler(req, context) {
    try {
        (0, authMiddleware_1.authenticate)(req);
        const skills = await prisma_1.prisma.skill.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        return { status: 200, jsonBody: skills };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('skills-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'skills',
    handler: listSkillsHandler,
});
