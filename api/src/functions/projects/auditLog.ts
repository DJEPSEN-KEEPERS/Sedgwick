import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function projectAuditLogHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { projectId } = req.params

    const logs = await prisma.auditLog.findMany({
      where: { entityId: projectId, entityType: 'Project' },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const formatted = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user,
      oldValue: log.oldValueJson ? JSON.parse(log.oldValueJson) : null,
      newValue: log.newValueJson ? JSON.parse(log.newValueJson) : null,
      createdAt: log.createdAt.toISOString(),
    }))

    return { status: 200, jsonBody: formatted }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-audit-log', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects/{projectId}/audit',
  handler: projectAuditLogHandler,
})
