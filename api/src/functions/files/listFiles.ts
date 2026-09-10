import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import type { ProjectAttachment } from '@prisma/client'

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
async function listFilesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const { projectId } = req.params
    const url = new URL(req.url)
    const clientVisibleParam = url.searchParams.get('clientVisible')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    // Access control
    if (jwtUser.role === 'INSURER_USER') {
      if (project.insuranceCompanyId !== jwtUser.linkedEntityId) {
        return { status: 403, jsonBody: { error: 'Ingen adgang' } }
      }
    }

    const where: Record<string, unknown> = { projectId }
    if (jwtUser.role === 'INSURER_USER' || clientVisibleParam === 'true') {
      where.isClientVisible = true
    }

    const allFiles = await prisma.projectAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // ── Categorise into structure FilesTab expects ────────────────────────────

    function groupByLabel(
      files: ProjectAttachment[],
      prefix: string,
      fallbackLabel: string,
    ): Record<string, ProjectAttachment[]> {
      const result: Record<string, ProjectAttachment[]> = {}
      for (const f of files) {
        // category may be 'status-update', 'status-update-Entreprise A', etc.
        const label = f.attachmentCategory.startsWith(prefix + '-')
          ? f.attachmentCategory.slice(prefix.length + 1)
          : fallbackLabel
        if (!result[label]) result[label] = []
        result[label].push(f)
      }
      return result
    }

    const categorised = {
      projectDocuments: allFiles.filter(
        (f) => f.attachmentCategory === 'general' || f.attachmentCategory === 'project',
      ),
      bidAttachments: allFiles.filter((f) => f.attachmentCategory === 'bid'),
      statusUpdatePhotos: groupByLabel(
        allFiles.filter((f) => f.attachmentCategory === 'status-update' || f.attachmentCategory.startsWith('status-update-')),
        'status-update',
        'Statusopdatering',
      ),
      finalReportFiles: groupByLabel(
        allFiles.filter((f) => f.attachmentCategory === 'final-report' || f.attachmentCategory.startsWith('final-report-')),
        'final-report',
        'Slutrapport',
      ),
      chatAttachments: allFiles.filter((f) => f.attachmentCategory === 'chat'),
    }

    // ── Fallback: uncategorised files go into projectDocuments ───────────────
    const knownCategories = new Set([
      'general', 'project', 'bid', 'chat',
      ...Object.values(categorised.statusUpdatePhotos).flat().map((f) => f.attachmentCategory),
      ...Object.values(categorised.finalReportFiles).flat().map((f) => f.attachmentCategory),
    ])
    const uncategorised = allFiles.filter((f) => !knownCategories.has(f.attachmentCategory))
    categorised.projectDocuments.push(...uncategorised)

    // ── Bid attachments (BidAttachment model, separate from ProjectAttachment) ──
    const bidAttachmentRecords = await prisma.bidAttachment.findMany({
      where: { bid: { projectId } },
      include: { bid: { select: { contractor: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' },
    })

    const bidFiles = bidAttachmentRecords.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      blobUrl: a.blobUrl,
      fileSizeMb: a.fileSizeMb,
      attachmentCategory: 'bid',
      isClientVisible: true,
      createdAt: a.createdAt,
      contractorName: (a as any).bid?.contractor?.companyName ?? null,
    }))

    return { status: 200, jsonBody: { ...categorised, bidAttachments: bidFiles } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('files-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/files',
  handler: listFilesHandler,
})
