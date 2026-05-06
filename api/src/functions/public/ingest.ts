import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { errorResponse } from '../../middleware/authMiddleware'

// Public REST API for insurance company systems to create cases
async function ingestHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return { status: 401, jsonBody: { error: 'API key required' } }
    }

    const insurer = await prisma.insuranceCompany.findUnique({ where: { apiKey } })
    if (!insurer || insurer.status !== 'active') {
      return { status: 401, jsonBody: { error: 'Invalid API key' } }
    }

    const body = await req.json() as Record<string, unknown>

    const required = ['claimId', 'insurerCaseId', 'insurancePolicyNumber', 'damageType',
      'damageDescription', 'buildingType', 'address', 'postalCode', 'city', 'region',
      'contactName', 'contactPhone', 'contactEmail']

    const missing = required.filter((f) => !body[f])
    if (missing.length > 0) {
      return { status: 400, jsonBody: { error: `Missing fields: ${missing.join(', ')}` } }
    }

    const existing = await prisma.project.findUnique({
      where: { claimId: body.claimId as string },
    })
    if (existing) {
      return { status: 409, jsonBody: { error: 'Project with this claimId already exists', id: existing.id } }
    }

    const project = await prisma.project.create({
      data: {
        claimId: body.claimId as string,
        insurerCaseId: body.insurerCaseId as string,
        insurancePolicyNumber: body.insurancePolicyNumber as string,
        insuranceCompanyId: insurer.id,
        damageType: body.damageType as string,
        damageDescription: body.damageDescription as string,
        priorityLevel: (body.priorityLevel as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') ?? 'NORMAL',
        buildingType: body.buildingType as string,
        address: body.address as string,
        postalCode: body.postalCode as string,
        city: body.city as string,
        region: body.region as string,
        gpsLat: body.gpsLat as number | undefined,
        gpsLng: body.gpsLng as number | undefined,
        maxApprovedPrice: body.maxApprovedPrice as number | undefined,
        estimatedScope: body.estimatedScope as string | undefined,
        slaCategory: body.slaCategory as string | undefined,
        contactName: body.contactName as string,
        contactPhone: body.contactPhone as string,
        contactEmail: body.contactEmail as string,
        createdViaApi: true,
      },
    })

    return { status: 201, jsonBody: { id: project.id, claimId: project.claimId } }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('public-ingest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'public/cases',
  handler: ingestHandler,
})
