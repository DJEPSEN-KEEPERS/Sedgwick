import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
interface UpdateStatusBody {
  milestone: string
  progressPercent: number
  comments?: string
  startedFlag?: boolean
  completedFlag?: boolean
  expectedCompletion?: string
}

async function updateEntrepriseStatusHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { entrepriseId } = req.params
    const body = (await req.json()) as UpdateStatusBody

    if (!body.milestone || body.progressPercent === undefined) {
      return { status: 400, jsonBody: { error: 'milestone og progressPercent er påkrævet' } }
    }

    const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } })
    if (!entreprise) {
      return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }
    }

    const statusUpdate = await prisma.entrepriseStatusUpdate.create({
      data: {
        entrepriseId,
        submittedByUserId: jwtUser.sub,
        milestone: body.milestone,
        progressPercent: body.progressPercent,
        comments: body.comments,
        startedFlag: body.startedFlag ?? false,
        completedFlag: body.completedFlag ?? false,
        expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : undefined,
        approvalStatus: 'PENDING',
      },
    })

    // SEDGWICK_ADMIN can directly update the entreprise milestone
    if (jwtUser.role === 'SEDGWICK_ADMIN') {
      await prisma.entreprise.update({
        where: { id: entrepriseId },
        data: { currentMilestone: body.milestone },
      })
    }

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'EntrepriseStatusUpdate',
      entityId: statusUpdate.id,
      action: 'CREATE',
      newValue: statusUpdate,
    })

    return { status: 201, jsonBody: statusUpdate }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('entreprises-update-status', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'entreprises/{entrepriseId}/status',
  handler: updateEntrepriseStatusHandler,
})
