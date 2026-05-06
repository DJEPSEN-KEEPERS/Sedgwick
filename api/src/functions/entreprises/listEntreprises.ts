import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listEntreprisesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const { projectId } = req.params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }

    // Insurer scope check
    if (jwtUser.role === 'INSURER_USER' && project.insuranceCompanyId !== jwtUser.linkedEntityId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang' } }
    }

    const where =
      jwtUser.role === 'CONTRACTOR_USER' && jwtUser.linkedEntityId
        ? { projectId, contractorId: jwtUser.linkedEntityId }
        : { projectId }

    const entreprises = await prisma.entreprise.findMany({
      where,
      include: {
        contractor: { select: { id: true, companyName: true, contactName: true, contactPhone: true } },
        statusUpdates: {
          orderBy: { createdAt: 'desc' },
          include: { submittedBy: { select: { id: true, fullName: true } }, attachments: true },
        },
        finalReport: { include: { answers: true, attachments: true } },
      },
      orderBy: { type: 'asc' },
    })

    return { status: 200, jsonBody: entreprises }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('entreprises-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/entreprises',
  handler: listEntreprisesHandler,
})
