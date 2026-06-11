import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
interface UpdateProjectBody {
  damageType?: string
  damageDescription?: string
  buildingType?: string
  priorityLevel?: string
  maxApprovedPrice?: number
  estimatedScope?: string
  requestedStartDate?: string
  requestedDeadline?: string
  slaCategory?: string
  address?: string
  postalCode?: string
  city?: string
  region?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  currentMilestone?: string
  status?: string
  finalCompletionDate?: string
  responsibleUserId?: string | null
}

async function updateProjectHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params
    const body = (await req.json()) as UpdateProjectBody

    const existing = await prisma.project.findUnique({ where: { id: projectId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }
    }

    // Gate: CASE_CLOSED requires the project to first be CASE_INVOICED
    if (body.currentMilestone === 'CASE_CLOSED' && existing.currentMilestone !== 'CASE_INVOICED') {
      return { status: 409, jsonBody: { error: 'Sagen skal faktureres før den kan lukkes' } }
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields: (keyof UpdateProjectBody)[] = [
      'damageType', 'damageDescription', 'buildingType', 'priorityLevel',
      'maxApprovedPrice', 'estimatedScope', 'slaCategory',
      'address', 'postalCode', 'city', 'region',
      'contactName', 'contactPhone', 'contactEmail',
      'currentMilestone', 'status',
    ]

    // responsibleUserId may be set to null (unassign) or a string (assign)
    if (body.responsibleUserId !== undefined) {
      updateData.responsibleUserId = body.responsibleUserId ?? null
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.requestedStartDate !== undefined) {
      updateData.requestedStartDate = body.requestedStartDate ? new Date(body.requestedStartDate) : null
    }
    if (body.requestedDeadline !== undefined) {
      updateData.requestedDeadline = body.requestedDeadline ? new Date(body.requestedDeadline) : null
    }
    if (body.finalCompletionDate !== undefined) {
      updateData.finalCompletionDate = body.finalCompletionDate ? new Date(body.finalCompletionDate) : null
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        responsibleUser: { select: { id: true, fullName: true, email: true } },
      },
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Project',
      entityId: projectId,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}',
  handler: updateProjectHandler,
})
