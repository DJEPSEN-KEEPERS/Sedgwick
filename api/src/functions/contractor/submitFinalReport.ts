import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function submitFinalReportHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const { entrepriseId } = req.params
    const body = await req.json() as {
      summary?: string
      answers: Array<{ questionKey: string; questionLabel: string; answerValue: string }>
      attachmentUrls?: Array<{ fileName: string; fileType: string; blobUrl: string; fileSizeMb: number }>
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { id: true, contractorId: true, project: { select: { selectedContractorId: true } } },
    })
    if (!entreprise) return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }
    if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const existing = await prisma.finalReport.findUnique({ where: { entrepriseId } })
    if (existing) return { status: 409, jsonBody: { error: 'Slutrapport er allerede indsendt for denne entreprise' } }

    const report = await prisma.finalReport.create({
      data: {
        entrepriseId,
        contractorId,
        submittedByUserId: jwtUser.sub,
        summary: body.summary,
        submittedAt: new Date(),
        answers: {
          create: (body.answers ?? []).map((a) => ({
            questionKey: a.questionKey,
            questionLabel: a.questionLabel,
            answerValue: a.answerValue,
          })),
        },
        attachments: body.attachmentUrls?.length
          ? {
              create: body.attachmentUrls.map((a) => ({
                fileName: a.fileName,
                fileType: a.fileType,
                blobUrl: a.blobUrl,
                fileSizeMb: a.fileSizeMb,
              })),
            }
          : undefined,
      },
      include: { answers: true, attachments: true },
    })

    // Advance entreprise milestone
    await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: { currentMilestone: 'COMPLETED', progressPercent: 100 },
    })

    return { status: 201, jsonBody: report }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-submit-final-report', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractor/entreprises/{entrepriseId}/final-report',
  handler: submitFinalReportHandler,
})
