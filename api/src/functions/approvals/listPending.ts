import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listPendingHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const [rawUpdates, rawReports] = await Promise.all([
      prisma.entrepriseStatusUpdate.findMany({
        where: { approvalStatus: 'PENDING' },
        include: {
          entreprise: {
            include: {
              project: { select: { id: true, claimId: true, address: true, city: true } },
              contractor: { select: { companyName: true } },
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.finalReport.findMany({
        where: { approvalStatus: 'PENDING' },
        include: {
          entreprise: {
            include: {
              project: { select: { id: true, claimId: true, address: true, city: true } },
              contractor: { select: { companyName: true } },
            },
          },
          submittedBy: { select: { id: true, fullName: true } },
          answers: true,
          attachments: true,
        },
        orderBy: { submittedAt: 'asc' },
      }),
    ])

    const statusUpdates = rawUpdates.map((u: any) => ({
      id: u.id,
      projectId: u.entreprise.project.id,
      projectClaimId: u.entreprise.project.claimId,
      entrepriseType: u.entreprise.type,
      contractorName: u.entreprise.contractor?.companyName ?? '—',
      milestone: u.milestone,
      progressPercent: u.progressPercent,
      comments: u.comments ?? undefined,
      attachments: u.attachments.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        blobUrl: a.blobUrl,
      })),
      submittedAt: u.createdAt.toISOString(),
    }))

    const finalReports = rawReports.map((r: any) => ({
      id: r.id,
      projectId: r.entreprise.project.id,
      projectClaimId: r.entreprise.project.claimId,
      entrepriseType: r.entreprise.type,
      contractorName: r.entreprise.contractor?.companyName ?? '—',
      summary: r.summary ?? undefined,
      answers: r.answers.map((a: any) => ({ questionLabel: a.questionLabel, answerValue: a.answerValue })),
      attachments: r.attachments.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        blobUrl: a.blobUrl,
      })),
      submittedAt: (r.submittedAt ?? r.createdAt).toISOString(),
    }))

    return { status: 200, jsonBody: { statusUpdates, finalReports } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('approvals-list-pending', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'approvals/pending',
  handler: listPendingHandler,
})
