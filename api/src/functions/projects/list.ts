import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listProjectsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const url = new URL(req.url)
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')))
    const status = url.searchParams.get('status') ?? undefined
    const search = url.searchParams.get('search') ?? undefined

    const where =
      jwtUser.role === 'INSURER_USER' && jwtUser.linkedEntityId
        ? { insuranceCompanyId: jwtUser.linkedEntityId, ...(status ? { status } : {}) }
        : jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
          ? { selectedContractorId: jwtUser.linkedEntityId, ...(status ? { status } : {}) }
          : status
            ? { status }
            : {}

    const projects = await prisma.project.findMany({
      where,
      include: {
        insuranceCompany: { select: { id: true, name: true } },
        selectedContractor: { select: { id: true, companyName: true } },
        entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: pageSize,
      ...(search
        ? {
            where: {
              ...where,
              OR: [
                { claimId: { contains: search } },
                { address: { contains: search } },
                { city: { contains: search } },
                { damageType: { contains: search } },
              ],
            },
          }
        : {}),
    })

    return { status: 200, jsonBody: projects }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects',
  handler: listProjectsHandler,
})
