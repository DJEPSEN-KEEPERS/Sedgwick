import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'

interface CreateContractorBody {
  companyName: string
  cvrNumber: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  address?: string
  postalCode?: string
  city?: string
  regions?: string[]
  maxParallelProjects?: number
}

async function createContractorHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const body = await req.json() as CreateContractorBody

    if (!body.companyName || !body.cvrNumber || !body.contactName || !body.contactEmail) {
      return { status: 400, jsonBody: { error: 'companyName, cvrNumber, contactName og contactEmail er påkrævet' } }
    }

    const existing = await prisma.contractor.findUnique({ where: { cvrNumber: body.cvrNumber } })
    if (existing) return { status: 409, jsonBody: { error: 'CVR-nummer er allerede registreret' } }

    const contractor = await prisma.contractor.create({
      data: {
        companyName: body.companyName,
        cvrNumber: body.cvrNumber,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone ?? '',
        maxParallelProjects: body.maxParallelProjects ?? 5,
        regions: body.regions?.length
          ? { create: body.regions.map((r) => ({ regionName: r })) }
          : undefined,
      },
      include: { regions: true },
    })

    await writeAuditLog({
      userId: jwtUser.sub,
      entityType: 'Contractor',
      entityId: contractor.id,
      action: 'CREATE',
      newValue: { companyName: contractor.companyName, cvrNumber: contractor.cvrNumber },
    })

    return { status: 201, jsonBody: { data: contractor } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractors-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractors',
  handler: createContractorHandler,
})
