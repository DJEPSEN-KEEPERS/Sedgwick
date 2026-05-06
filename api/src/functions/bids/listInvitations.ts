import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listInvitationsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN', 'CONTRACTOR_USER')

    const { projectId } = req.params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    const where =
      jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
        ? { projectId, contractorId: jwtUser.linkedEntityId }
        : { projectId }

    const invitations = await prisma.bidInvitation.findMany({
      where,
      include: {
        contractor: {
          select: {
            id: true,
            companyName: true,
            cvrNumber: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            sedgwickRatingAvg: true,
            regions: true,
            skills: { include: { skill: true } },
          },
        },
        invitedBy: { select: { id: true, fullName: true } },
        bid: true,
      },
      orderBy: { invitedAt: 'desc' },
    })

    return { status: 200, jsonBody: invitations }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('invitations-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/invitations',
  handler: listInvitationsHandler,
})
