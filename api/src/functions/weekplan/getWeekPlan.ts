import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getWeekPlanHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { projectId } = req.params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    // Load all entreprises for the project, then their week plans
    const entreprises = await prisma.entreprise.findMany({
      where: { projectId, isRelevant: { not: false } },
      select: { id: true },
    })
    const entrepriseIds = entreprises.map((e) => e.id)

    const checked = await prisma.entrepriseWeekPlan.findMany({
      where: { entrepriseId: { in: entrepriseIds } },
      select: { entrepriseId: true, isoYear: true, isoWeek: true },
      orderBy: [{ isoYear: 'asc' }, { isoWeek: 'asc' }],
    })

    return { status: 200, jsonBody: { checked } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('weekplan-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/week-plan',
  handler: getWeekPlanHandler,
})
