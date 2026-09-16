import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getMyInvitationsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const invitations = await prisma.bidInvitation.findMany({
      where: { contractorId },
      include: {
        project: {
          select: {
            id: true,
            claimId: true,
            address: true,
            postalCode: true,
            city: true,
            region: true,
            damageType: true,
            damageDescription: true,
            buildingType: true,
            estimatedScope: true,
            priorityLevel: true,
            currentMilestone: true,
            requestedDeadline: true,
            requestedStartDate: true,
            createdAt: true,
            insurerCaseId: true,
            insurancePolicyNumber: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            entreprises: { select: { id: true, type: true, isRelevant: true } },
            insuranceCompany: { select: { name: true } },
            attachments: {
              select: { id: true, fileName: true, fileType: true, blobUrl: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        bid: { select: { id: true, bidAmount: true, submittedAt: true, isSelected: true } },
      },
      orderBy: { invitedAt: 'desc' },
    })

    return { status: 200, jsonBody: invitations }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-my-invitations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/invitations',
  handler: getMyInvitationsHandler,
})
