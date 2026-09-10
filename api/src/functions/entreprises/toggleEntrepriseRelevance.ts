import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

interface ToggleBody {
  isRelevant: boolean
}

async function toggleEntrepriseRelevanceHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN', 'INSURER_USER', 'CONTRACTOR_USER')

    const { projectId, type } = req.params
    const body = (await req.json()) as ToggleBody

    if (typeof body.isRelevant !== 'boolean') {
      return { status: 400, jsonBody: { error: 'isRelevant (boolean) er påkrævet' } }
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    // Scope checks
    if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang til denne sag' } }
    }
    if (jwtUser.role === 'CONTRACTOR_USER') {
      const hasBid = await prisma.bid.findFirst({ where: { projectId, contractorId: jwtUser.linkedEntityId! } })
      const hasInvitation = await prisma.bidInvitation.findFirst({ where: { projectId, contractorId: jwtUser.linkedEntityId! } })
      if (!hasBid && !hasInvitation) return { status: 403, jsonBody: { error: 'Ingen adgang til denne sag' } }
    }

    const markedBy = jwtUser.role === 'SEDGWICK_ADMIN' ? 'sedgwick'
      : jwtUser.role === 'INSURER_USER' ? 'insurer'
      : 'contractor'

    const existing = await prisma.entreprise.findFirst({ where: { projectId, type } })

    let result
    if (existing) {
      result = await prisma.entreprise.update({
        where: { id: existing.id },
        data: { isRelevant: body.isRelevant, markedRelevantBy: markedBy },
      })
      await writeAuditLog({
        userId: jwtUser.sub,
        entityType: 'Entreprise',
        entityId: existing.id,
        action: 'UPDATE_RELEVANCE',
        oldValue: { isRelevant: existing.isRelevant },
        newValue: { isRelevant: body.isRelevant },
      })
    } else {
      result = await prisma.entreprise.create({
        data: {
          projectId,
          type,
          isRelevant: body.isRelevant,
          markedRelevantBy: markedBy,
          currentMilestone: 'NOT_STARTED',
          progressPercent: 0,
        },
      })
      await writeAuditLog({
        userId: jwtUser.sub,
        entityType: 'Entreprise',
        entityId: result.id,
        action: 'CREATE',
        newValue: { type, isRelevant: body.isRelevant },
      })
    }

    return { status: 200, jsonBody: result }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('entreprises-toggle-relevance', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/entreprises/{type}/relevance',
  handler: toggleEntrepriseRelevanceHandler,
})
