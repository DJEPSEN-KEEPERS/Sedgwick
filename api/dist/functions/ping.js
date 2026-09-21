"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../lib/prisma");
async function pingHandler(_req, _context) {
    const start = Date.now();
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    return {
        status: 200,
        jsonBody: { ok: true, ms: Date.now() - start },
    };
}
functions_1.app.http('ping', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ping',
    handler: pingHandler,
});
