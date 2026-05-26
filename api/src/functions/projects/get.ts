import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function getProjectHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    const projectId = req.params.projectId

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        insuranceCompany: { select: { id: true, name: true } },
        selectedContractor: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
        entreprises: {
          include: {
            contractor: { select: { id: true, companyName: true } },
            statusUpdates: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, milestone: true, progressPercent: true, comments: true, approvalStatus: true, createdAt: true },
            },
            finalReport: {
              select: { id: true, approvalStatus: true, submittedAt: true },
            },
          },
        },
        bidInvitations: {
          include: {
            contractor: {
              select: { id: true, companyName: true, cvrNumber: true, sedgwickRatingAvg: true },
            },
            bid: true,
          },
        },
        responsibleUser: { select: { id: true, fullName: true, email: true } },
        chatChannels: {
          select: { id: true, channelType: true, name: true, createdAt: true },
        },
        attachments: true,
      },
    })

    if (!project) {
      return { status: 404, jsonBody: { error: 'Sag ikke fundet' } }
    }

    // Scope check
    if (
      jwtUser.role === 'INSURER_USER' &&
      project.insuranceCompanyId !== jwtUser.linkedEntityId
    ) {
      return { status: 403, jsonBody: { error: 'Adgang nægtet' } }
    }

    if (jwtUser.role === 'CONTRACTOR_USER') {
      const contractorId = jwtUser.linkedEntityId
      const isSelected = project.selectedContractorId === contractorId
      const hasInvitation = contractorId
        ? await prisma.bidInvitation.findFirst({ where: { projectId: project.id, contractorId } })
        : null
      if (!isSelected && !hasInvitation) {
        return { status: 403, jsonBody: { error: 'Adgang nægtet' } }
      }
    }

    return { status: 200, jsonBody: project }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}',
  handler: getProjectHandler,
})
