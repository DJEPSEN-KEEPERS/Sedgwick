import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'

interface CreateProjectPublicBody {
  claimId: string
  insurerCaseId?: string
  insurancePolicyNumber?: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  postalCode: string
  city: string
  region: string
  buildingType: string
  damageType: string
  damageDescription?: string
  requestedStartDate?: string
  requestedDeadline?: string
  apiKey: string
}

async function createProjectPublicHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as CreateProjectPublicBody

    // API key authentication
    const apiKey = req.headers.get('x-api-key') ?? body.apiKey
    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      return { status: 401, jsonBody: { error: 'Ugyldig API-nøgle' } }
    }

    if (!body.claimId || !body.contactName || !body.contactEmail || !body.address) {
      return { status: 400, jsonBody: { error: 'claimId, contactName, contactEmail og address er påkrævet' } }
    }

    // Look up insurance company by API key
    const insurer = await prisma.insuranceCompany.findFirst({
      where: { apiKey },
    })
    if (!insurer) return { status: 401, jsonBody: { error: 'API-nøgle tilhører ikke et registreret forsikringsselskab' } }

    const existing = await prisma.project.findFirst({ where: { claimId: body.claimId } })
    if (existing) return { status: 409, jsonBody: { error: 'Sags-ID eksisterer allerede' } }

    const project = await prisma.project.create({
      data: {
        claimId: body.claimId,
        insurerCaseId: body.insurerCaseId ?? null,
        insurancePolicyNumber: body.insurancePolicyNumber ?? null,
        insuranceCompanyId: insurer.id,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        address: body.address,
        postalCode: body.postalCode,
        city: body.city,
        region: body.region,
        buildingType: body.buildingType,
        damageType: body.damageType,
        damageDescription: body.damageDescription ?? null,
        requestedStartDate: body.requestedStartDate ? new Date(body.requestedStartDate) : null,
        requestedDeadline: body.requestedDeadline ? new Date(body.requestedDeadline) : null,
        currentMilestone: 'CASE_RECEIVED',
        status: 'ACTIVE',
        progressPercent: 0,
      },
    })

    return {
      status: 201,
      jsonBody: {
        id: project.id,
        claimId: project.claimId,
        currentMilestone: project.currentMilestone,
        createdAt: project.createdAt,
      },
    }
  } catch (err) {
    context.error(err)
    return { status: 500, jsonBody: { error: 'Intern serverfejl' } }
  }
}

app.http('public-create-project', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'public/cases',
  handler: createProjectPublicHandler,
})
