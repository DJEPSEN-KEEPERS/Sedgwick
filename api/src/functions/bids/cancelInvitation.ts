import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

async function cancelInvitationHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { invitationId } = req.params

    const invitation = await prisma.bidInvitation.findUnique({
      where: { id: invitationId },
      include: { bid: { select: { id: true, isSelected: true } } },
    })
    if (!invitation) {
      return { status: 404, jsonBody: { error: 'Invitation ikke fundet' } }
    }

    if (invitation.bid) {
      if (invitation.bid.isSelected) {
        return { status: 409, jsonBody: { error: 'Invitationen kan ikke annulleres - tilbuddet er allerede valgt for denne sag.' } }
      }
      return { status: 409, jsonBody: { error: 'Invitationen kan ikke annulleres - håndværkeren har allerede afgivet et tilbud. Slet eller afvis tilbuddet først.' } }
    }

    await prisma.bidInvitation.delete({ where: { id: invitationId } })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'BidInvitation',
      entityId: invitationId,
      action: 'DELETE',
      oldValue: invitation,
    })

    return { status: 200, jsonBody: { message: 'Invitation annulleret' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('invitations-cancel', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'invitations/{invitationId}',
  handler: cancelInvitationHandler,
})
