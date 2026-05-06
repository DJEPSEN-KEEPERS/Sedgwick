import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

interface UpdateRelevanceBody {
  isRelevant: boolean
}

async function updateEntrepriseRelevanceHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { entrepriseId } = req.params
    const body = (await req.json()) as UpdateRelevanceBody

    if (typeof body.isRelevant !== 'boolean') {
      return { status: 400, jsonBody: { error: 'isRelevant (boolean) er påkrævet' } }
    }

    const existing = await prisma.entreprise.findUnique({ where: { id: entrepriseId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }
    }

    const updated = await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: {
        isRelevant: body.isRelevant,
        markedRelevantBy: 'sedgwick',
      },
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Entreprise',
      entityId: entrepriseId,
      action: 'UPDATE_RELEVANCE',
      oldValue: { isRelevant: existing.isRelevant, markedRelevantBy: existing.markedRelevantBy },
      newValue: { isRelevant: updated.isRelevant, markedRelevantBy: updated.markedRelevantBy },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('entreprises-update-relevance', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'entreprises/{entrepriseId}/relevance',
  handler: updateEntrepriseRelevanceHandler,
})
