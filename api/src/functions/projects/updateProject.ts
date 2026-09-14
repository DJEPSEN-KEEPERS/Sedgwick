import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

const PROJECT_MILESTONES = [
  'CASE_RECEIVED', 'BIDDING_IN_PROGRESS', 'CONTRACTOR_SELECTED',
  'WORK_SCHEDULED', 'WORK_STARTED', 'WORK_COMPLETED',
  'FINAL_REPORT_SUBMITTED', 'CASE_INVOICED', 'CASE_CLOSED',
] as const

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

    if (body.currentMilestone !== undefined && !(PROJECT_MILESTONES as readonly string[]).includes(body.currentMilestone)) {
      return {
        status: 400,
        jsonBody: { error: `Ugyldig sagsfase: '${body.currentMilestone}'. Gyldige værdier er: ${PROJECT_MILESTONES.join(', ')}` },
      }
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

    // Warn in audit log when milestone moves backwards (allowed, but worth tracking)
    if (body.currentMilestone && existing.currentMilestone) {
      const newIdx = PROJECT_MILESTONES.indexOf(body.currentMilestone as typeof PROJECT_MILESTONES[number])
      const oldIdx = PROJECT_MILESTONES.indexOf(existing.currentMilestone as typeof PROJECT_MILESTONES[number])
      if (newIdx !== -1 && oldIdx !== -1 && newIdx < oldIdx) {
        await writeAuditLog({
          userId: jwtUser.sub,
          entityType: 'Project',
          entityId: projectId,
          action: 'MILESTONE_REGRESSION',
          oldValue: { currentMilestone: existing.currentMilestone, step: oldIdx },
          newValue: { currentMilestone: body.currentMilestone, step: newIdx },
        })
      }
    }

    // Decrement workload when a case is closed — only on the actual transition to avoid double-counting
    if (
      body.currentMilestone === 'CASE_CLOSED' &&
      existing.currentMilestone !== 'CASE_CLOSED' &&
      existing.selectedContractorId
    ) {
      await prisma.contractor.updateMany({
        where: { id: existing.selectedContractorId, currentWorkload: { gt: 0 } },
        data: { currentWorkload: { decrement: 1 } },
      })
    }

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
