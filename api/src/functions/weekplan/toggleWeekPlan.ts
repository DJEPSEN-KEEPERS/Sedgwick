import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

interface ToggleBody {
  isoYear: number
  isoWeek: number
}

async function toggleWeekPlanHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER', 'SEDGWICK_ADMIN')

    const { entrepriseId } = req.params
    const body = (await req.json()) as ToggleBody

    if (!body.isoYear || !body.isoWeek) {
      return { status: 400, jsonBody: { error: 'isoYear og isoWeek er påkrævet' } }
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: { project: { select: { id: true } } },
    })
    if (!entreprise) return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }

    // Contractor can only edit their own entreprises
    if (jwtUser.role === 'CONTRACTOR_USER' && entreprise.contractorId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const existing = await prisma.entrepriseWeekPlan.findUnique({
      where: { entrepriseId_isoYear_isoWeek: { entrepriseId, isoYear: body.isoYear, isoWeek: body.isoWeek } },
    })

    if (existing) {
      await prisma.entrepriseWeekPlan.delete({ where: { id: existing.id } })
      return { status: 200, jsonBody: { active: false } }
    } else {
      await prisma.entrepriseWeekPlan.create({
        data: { entrepriseId, isoYear: body.isoYear, isoWeek: body.isoWeek },
      })
      return { status: 200, jsonBody: { active: true } }
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('weekplan-toggle', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'entreprises/{entrepriseId}/week-plan',
  handler: toggleWeekPlanHandler,
})
