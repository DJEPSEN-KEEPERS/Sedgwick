import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { getRecommendations } from '../../lib/recommendationEngine'

async function getRecommendationsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params

    const results = await getRecommendations(projectId)

    // Enrich with contractor details and normalize breakdown field names for frontend
    const contractorIds = results.map((r) => r.contractorId)
    const contractors = await prisma.contractor.findMany({
      where: { id: { in: contractorIds } },
      include: { regions: true, skills: { include: { skill: true } }, certifications: true },
    })
    const contractorMap = new Map(contractors.map((c: any) => [c.id, c]))

    const enriched = results.map((r) => ({
      contractorId: r.contractorId,
      companyName: r.companyName,
      totalScore: r.totalScore,
      matchReasons: r.matchReasons,
      breakdown: {
        regionScore: r.breakdown.regionMatch,
        skillScore: r.breakdown.skillMatch,
        ratingScore: r.breakdown.ratingScore,
        workloadScore: -r.breakdown.workloadPenalty,
      },
      contractor: contractorMap.get(r.contractorId) ?? null,
    }))

    return { status: 200, jsonBody: enriched }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-recommendations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/recommendations',
  handler: getRecommendationsHandler,
})
