import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listBidsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    const bids = await prisma.bid.findMany({
      where: { projectId },
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
          },
        },
        attachments: true,
        selectedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return { status: 200, jsonBody: bids }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('bids-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/bids',
  handler: listBidsHandler,
})
