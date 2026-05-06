import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { notifyNewInvitation } from '../../lib/notificationService'

interface InviteContractorBody {
  contractorId: string
}

async function inviteContractorHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params
    const body = (await req.json()) as InviteContractorBody

    if (!body.contractorId) {
      return { status: 400, jsonBody: { error: 'contractorId er påkrævet' } }
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }
    }

    const contractor = await prisma.contractor.findUnique({ where: { id: body.contractorId } })
    if (!contractor) {
      return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } }
    }

    const existing = await prisma.bidInvitation.findFirst({
      where: { projectId, contractorId: body.contractorId },
    })
    if (existing) {
      return { status: 409, jsonBody: { error: 'Håndværkeren er allerede inviteret til dette projekt' } }
    }

    const invitation = await prisma.bidInvitation.create({
      data: {
        projectId,
        contractorId: body.contractorId,
        invitedByUserId: jwtUser.sub,
        status: 'PENDING',
      },
      include: {
        contractor: { select: { id: true, companyName: true } },
        invitedBy: { select: { id: true, fullName: true } },
      },
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'BidInvitation',
      entityId: invitation.id,
      action: 'CREATE',
      newValue: { projectId, contractorId: body.contractorId },
    })

    await notifyNewInvitation(body.contractorId, project.claimId)

    return { status: 201, jsonBody: invitation }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('invitations-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/invite',
  handler: inviteContractorHandler,
})
