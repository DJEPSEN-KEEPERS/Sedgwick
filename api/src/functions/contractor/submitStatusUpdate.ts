import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function submitStatusUpdateHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const { entrepriseId } = req.params
    const body = await req.json() as {
      milestone: string
      progressPercent: number
      startedFlag?: boolean
      completedFlag?: boolean
      expectedCompletion?: string
      comments?: string
      attachmentUrls?: Array<{ fileName: string; fileType: string; blobUrl: string; fileSizeMb: number }>
    }

    if (!body.milestone || body.progressPercent == null) {
      return { status: 400, jsonBody: { error: 'milestone og progressPercent er påkrævet' } }
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { id: true, contractorId: true, project: { select: { selectedContractorId: true } } },
    })
    if (!entreprise) return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }
    if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const update = await prisma.entrepriseStatusUpdate.create({
      data: {
        entrepriseId,
        submittedByUserId: jwtUser.sub,
        milestone: body.milestone as never,
        progressPercent: body.progressPercent,
        startedFlag: body.startedFlag ?? false,
        completedFlag: body.completedFlag ?? false,
        expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : undefined,
        comments: body.comments,
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
      include: { attachments: true },
    })

    // Keep entreprise milestone and progress in sync
    await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: {
        currentMilestone: body.milestone as never,
        progressPercent: body.progressPercent,
        actualStart: body.startedFlag ? new Date() : undefined,
        actualEnd: body.completedFlag ? new Date() : undefined,
      },
    })

    return { status: 201, jsonBody: update }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-submit-status-update', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractor/entreprises/{entrepriseId}/status-updates',
  handler: submitStatusUpdateHandler,
})
