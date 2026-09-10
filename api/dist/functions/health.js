"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (_req, _context) => {
        return {
            status: 200,
            jsonBody: { ok: true, timestamp: new Date().toISOString() },
        };
    },
});
