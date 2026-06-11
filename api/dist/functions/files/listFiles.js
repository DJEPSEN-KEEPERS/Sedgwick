"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
/**
 * GET /projects/{projectId}/files
 *
 * Returns files grouped into the structure FilesTab expects:
 *   projectDocuments    – category 'general' | 'project' (default uploads)
 *   bidAttachments      – category 'bid'
 *   statusUpdatePhotos  – category 'status-update' or 'status-update-<label>'
 *   finalReportFiles    – category 'final-report' or 'final-report-<label>'
 *   chatAttachments     – category 'chat'
 */
async function listFilesHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { projectId } = req.params;
        const url = new URL(req.url);
        const clientVisibleParam = url.searchParams.get('clientVisible');
        const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } };
        // Access control
        if (jwtUser.role === 'INSURER_USER') {
            if (project.insuranceCompanyId !== jwtUser.linkedEntityId) {
                return { status: 403, jsonBody: { error: 'Ingen adgang' } };
            }
        }
        const where = { projectId };
        if (jwtUser.role === 'INSURER_USER' || clientVisibleParam === 'true') {
            where.isClientVisible = true;
        }
        const allFiles = await prisma_1.prisma.projectAttachment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        // ── Categorise into structure FilesTab expects ────────────────────────────
        function groupByLabel(files, prefix, fallbackLabel) {
            const result = {};
            for (const f of files) {
                // category may be 'status-update', 'status-update-Entreprise A', etc.
                const label = f.attachmentCategory.startsWith(prefix + '-')
                    ? f.attachmentCategory.slice(prefix.length + 1)
                    : fallbackLabel;
                if (!result[label])
                    result[label] = [];
                result[label].push(f);
            }
            return result;
        }
        const categorised = {
            projectDocuments: allFiles.filter((f) => f.attachmentCategory === 'general' || f.attachmentCategory === 'project'),
            bidAttachments: allFiles.filter((f) => f.attachmentCategory === 'bid'),
            statusUpdatePhotos: groupByLabel(allFiles.filter((f) => f.attachmentCategory === 'status-update' || f.attachmentCategory.startsWith('status-update-')), 'status-update', 'Statusopdatering'),
            finalReportFiles: groupByLabel(allFiles.filter((f) => f.attachmentCategory === 'final-report' || f.attachmentCategory.startsWith('final-report-')), 'final-report', 'Slutrapport'),
            chatAttachments: allFiles.filter((f) => f.attachmentCategory === 'chat'),
        };
        // ── Fallback: uncategorised files go into projectDocuments ───────────────
        const knownCategories = new Set([
            'general', 'project', 'bid', 'chat',
            ...Object.values(categorised.statusUpdatePhotos).flat().map((f) => f.attachmentCategory),
            ...Object.values(categorised.finalReportFiles).flat().map((f) => f.attachmentCategory),
        ]);
        const uncategorised = allFiles.filter((f) => !knownCategories.has(f.attachmentCategory));
        categorised.projectDocuments.push(...uncategorised);
        return { status: 200, jsonBody: categorised };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('files-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'projects/{projectId}/files',
    handler: listFilesHandler,
});
