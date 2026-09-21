import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

const ALLOWED: string[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'CONTRACTOR_USER')

    const contractorId = jwtUser.linkedEntityId
    if (!contractorId) return { status: 400, jsonBody: { error: 'Ingen håndværker tilknyttet brugeren' } }

    const { entrepriseId } = req.params
    const { milestone } = (await req.json()) as { milestone: string }

    if (!ALLOWED.includes(milestone)) {
      return { status: 400, jsonBody: { error: 'Ugyldig status. Gyldige værdier: NOT_STARTED, IN_PROGRESS, COMPLETED' } }
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: { project: { select: { id: true, selectedContractorId: true } } },
    })
    if (!entreprise) return { status: 404, jsonBody: { error: 'Entreprise ikke fundet' } }

    const projectId = entreprise.project.id
    const isSelected = entreprise.project.selectedContractorId === contractorId
    if (!isSelected) {
      const hasBid = await prisma.bid.findFirst({ where: { projectId, contractorId } })
      const hasInvitation = await prisma.bidInvitation.findFirst({ where: { projectId, contractorId } })
      if (!hasBid && !hasInvitation) {
        return { status: 403, jsonBody: { error: 'Ingen adgang til denne entreprise' } }
      }
    }

    const updated = await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: { currentMilestone: milestone },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractor-update-entreprise-milestone', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'contractor/entreprises/{entrepriseId}/milestone',
  handler,
})
