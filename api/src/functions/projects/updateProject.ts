import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import type { ProjectMilestone, ProjectStatus, PriorityLevel } from '@prisma/client'

interface UpdateProjectBody {
  damageDescription?: string
  priorityLevel?: PriorityLevel
  maxApprovedPrice?: number
  estimatedScope?: string
  requestedStartDate?: string
  requestedDeadline?: string
  slaCategory?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  currentMilestone?: ProjectMilestone
  status?: ProjectStatus
  finalCompletionDate?: string
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

    const updateData: Record<string, unknown> = {}
    const allowedFields: (keyof UpdateProjectBody)[] = [
      'damageDescription', 'priorityLevel', 'maxApprovedPrice', 'estimatedScope',
      'slaCategory', 'contactName', 'contactPhone', 'contactEmail',
      'currentMilestone', 'status',
    ]

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
