import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function submitBidHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const body = await req.json() as {
      projectId: string
      materialsCost: number
      laborCost: number
      comments?: string
      entrepriseRelevance?: Record<string, boolean>
    }

    if (!body.projectId || !body.materialsCost || !body.laborCost) {
      return { status: 400, jsonBody: { error: 'projectId, materialsCost og laborCost er påkrævet' } }
    }
    const bidAmount = body.materialsCost + body.laborCost

    const invitation = await prisma.bidInvitation.findFirst({
      where: { projectId: body.projectId, contractorId, status: 'INTERESTED' },
    })
    if (!invitation) {
      return { status: 404, jsonBody: { error: 'Ingen aktiv invitation fundet for denne sag' } }
    }

    const existingBid = await prisma.bid.findUnique({ where: { bidInvitationId: invitation.id } })
    if (existingBid) {
      return { status: 409, jsonBody: { error: 'Du har allerede afgivet et bud på denne sag' } }
    }

    const bid = await prisma.bid.create({
      data: {
        projectId: body.projectId,
        contractorId,
        bidInvitationId: invitation.id,
        bidAmount,
        materialsCost: body.materialsCost,
        laborCost: body.laborCost,
        currency: 'DKK',
        comments: body.comments,
      },
    })

    // Update entreprise relevance if provided
    if (body.entrepriseRelevance) {
      const updates = Object.entries(body.entrepriseRelevance).map(([entrepriseId, isRelevant]) =>
        prisma.entreprise.updateMany({
          where: { id: entrepriseId, projectId: body.projectId },
          data: { isRelevant, markedRelevantBy: contractorId },
        }),
      )
      await Promise.all(updates)
    }

    return { status: 201, jsonBody: bid }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-submit-bid', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractor/bids',
  handler: submitBidHandler,
})
