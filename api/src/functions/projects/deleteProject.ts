import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

/**
 * DELETE /projects/{projectId}
 *
 * Soft-closes the project (status → CLOSED) rather than a hard delete,
 * preserving the full audit trail and all linked records (bids, chat, reports).
 * Hard delete is intentionally not supported via API.
 */
async function deleteProjectHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params

    const existing = await prisma.project.findUnique({ where: { id: projectId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Projekt ikke fundet' } }
    }

    if (existing.status === 'CLOSED') {
      return { status: 409, jsonBody: { error: 'Projektet er allerede lukket' } }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: 'CLOSED' },
    })

    await writeAuditLog({
      userId:     jwtUser.sub,
      entityType: 'Project',
      entityId:   projectId,
      action:     'DELETE',
      oldValue:   existing,
      newValue:   updated,
    })

    return { status: 200, jsonBody: { deleted: true, status: 'CLOSED' } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}',
  handler: deleteProjectHandler,
})
