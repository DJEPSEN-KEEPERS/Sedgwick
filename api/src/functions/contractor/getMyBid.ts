import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getMyBidHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const { projectId } = req.params

    const bid = await prisma.bid.findFirst({
      where: { projectId, contractorId },
      include: { attachments: true },
    })

    if (!bid) return { status: 404, jsonBody: { error: 'Intet bud fundet' } }

    return { status: 200, jsonBody: bid }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-get-my-bid', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/bids/{projectId}',
  handler: getMyBidHandler,
})
