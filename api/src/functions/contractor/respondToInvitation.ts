import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function respondToInvitationHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const { invitationId } = req.params
    const body = await req.json() as { status: 'INTERESTED' | 'NOT_INTERESTED' }

    if (!['INTERESTED', 'NOT_INTERESTED'].includes(body.status)) {
      return { status: 400, jsonBody: { error: 'Ugyldig status' } }
    }

    const invitation = await prisma.bidInvitation.findUnique({ where: { id: invitationId } })
    if (!invitation) return { status: 404, jsonBody: { error: 'Invitation ikke fundet' } }
    if (invitation.contractorId !== contractorId) return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    if (invitation.status !== 'PENDING') return { status: 409, jsonBody: { error: 'Invitationen er allerede besvaret' } }

    const updated = await prisma.bidInvitation.update({
      where: { id: invitationId },
      data: { status: body.status, respondedAt: new Date() },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-respond-invitation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractor/invitations/{invitationId}/respond',
  handler: respondToInvitationHandler,
})
