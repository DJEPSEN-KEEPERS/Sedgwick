import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Ingen håndværker tilknyttet brugeren' } }

    const { projectId } = req.params
    const { userId } = (await req.json()) as { userId: string | null }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Sag ikke fundet' } }
    if (project.selectedContractorId !== contractorId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang til denne sag' } }
    }

    if (userId) {
      const member = await prisma.contractorUser.findFirst({ where: { contractorId, userId } })
      if (!member) return { status: 400, jsonBody: { error: 'Brugeren er ikke en del af jeres virksomhed' } }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { contractorProjectManagerId: userId ?? null },
      include: { contractorProjectManager: { select: { id: true, fullName: true } } },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-set-project-manager', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'contractor/jobs/{projectId}/project-manager',
  handler,
})
