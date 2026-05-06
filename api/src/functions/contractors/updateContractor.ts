import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

interface UpdateContractorBody {
  companyName?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  maxParallelProjects?: number
  status?: string
  regions?: string[]
}

async function updateContractorHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { contractorId } = req.params
    const body = await req.json() as UpdateContractorBody

    const existing = await prisma.contractor.findUnique({ where: { id: contractorId } })
    if (!existing) return { status: 404, jsonBody: { error: 'Håndværker ikke fundet' } }

    const { regions, ...fields } = body

    const updated = await prisma.$transaction(async (tx) => {
      if (regions !== undefined) {
        await tx.contractorRegion.deleteMany({ where: { contractorId } })
        if (regions.length > 0) {
          await tx.contractorRegion.createMany({
            data: regions.map((r) => ({ contractorId, regionName: r })),
          })
        }
      }
      return tx.contractor.update({
        where: { id: contractorId },
        data: fields,
        include: { regions: true, skills: { include: { skill: true } } },
      })
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Contractor',
      entityId: contractorId,
      action: 'UPDATE',
      oldValue: { companyName: existing.companyName, status: existing.status },
      newValue: fields,
    })

    return { status: 200, jsonBody: { data: updated } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractors-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'contractors/{contractorId}',
  handler: updateContractorHandler,
})
