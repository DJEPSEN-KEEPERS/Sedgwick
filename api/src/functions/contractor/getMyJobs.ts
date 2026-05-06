import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getMyJobsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const jobs = await prisma.project.findMany({
      where: { selectedContractorId: contractorId },
      include: {
        insuranceCompany: { select: { id: true, name: true } },
        entreprises: {
          where: { contractorId },
          select: {
            id: true,
            type: true,
            currentMilestone: true,
            progressPercent: true,
            scheduledStart: true,
            scheduledEnd: true,
            isRelevant: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    })

    return { status: 200, jsonBody: jobs }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-my-jobs', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/jobs',
  handler: getMyJobsHandler,
})
