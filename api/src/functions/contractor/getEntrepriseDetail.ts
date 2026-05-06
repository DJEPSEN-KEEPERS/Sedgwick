import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function getEntrepriseDetailHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Bruger er ikke tilknyttet en håndværkervirksomhed' } }

    const { entrepriseId } = req.params

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: {
        project: {
          select: {
            id: true,
            claimId: true,
            address: true,
            city: true,
            contactName: true,
            contactPhone: true,
            selectedContractorId: true,
          },
        },
        statusUpdates: {
          orderBy: { createdAt: 'desc' },
          include: { attachments: true },
        },
        finalReport: {
          include: { answers: true, attachments: true },
        },
      },
    })

    if (!entreprise) return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }
    if (entreprise.contractorId !== contractorId && entreprise.project.selectedContractorId !== contractorId) {
      return { status: 403, jsonBody: { error: 'Ingen adgang til denne entreprise' } }
    }

    return { status: 200, jsonBody: entreprise }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-entreprise-detail', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractor/entreprises/{entrepriseId}',
  handler: getEntrepriseDetailHandler,
})
