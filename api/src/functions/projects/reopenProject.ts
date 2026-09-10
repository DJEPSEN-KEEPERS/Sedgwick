import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

async function reopenProjectHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params

    const existing = await prisma.project.findUnique({ where: { id: projectId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }
    }

    if (existing.status !== 'CLOSED') {
      return { status: 409, jsonBody: { error: 'Projektet er ikke lukket og kan ikke genåbnes' } }
    }

    // Restore status to ACTIVE. currentMilestone is left unchanged — it already reflects
    // the phase the project had reached before it was closed, which is the honest state.
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE' },
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Project',
      entityId: projectId,
      action: 'REOPEN',
      oldValue: { status: existing.status },
      newValue: { status: 'ACTIVE', currentMilestone: existing.currentMilestone },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-reopen', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/reopen',
  handler: reopenProjectHandler,
})
