import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function insurerDashboardHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'INSURER_USER')

    const insuranceCompanyId = jwtUser.linkedEntityId
    if (!insuranceCompanyId) {
      return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet et forsikringsselskab' } }
    }

    const [active, completed, all, recentProjects] = await Promise.all([
      prisma.project.count({ where: { insuranceCompanyId, status: 'ACTIVE' } }),
      prisma.project.count({ where: { insuranceCompanyId, status: 'COMPLETED' } }),
      prisma.project.findMany({
        where: { insuranceCompanyId },
        select: { requestedDeadline: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: { insuranceCompanyId },
        include: {
          selectedContractor: { select: { id: true, companyName: true } },
          entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ])

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
    const delayed = all.filter((p: any) => p.requestedDeadline && new Date(p.requestedDeadline) < now).length
    const recentlyUpdated = all.filter((p: any) => new Date(p.updatedAt) >= sevenDaysAgo).length

    return {
      status: 200,
      jsonBody: {
        stats: { active, completed, delayed, recentlyUpdated },
        recentProjects,
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('insurer-dashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'insurer/dashboard',
  handler: insurerDashboardHandler,
})
