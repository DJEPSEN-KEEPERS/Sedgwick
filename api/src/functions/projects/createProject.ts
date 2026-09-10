import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { writeAuditLog } from '../../lib/auditLog'
import { ensureProjectChannel } from '../../lib/projectChannel'

interface CreateProjectBody {
  // Core identifiers
  claimId?: string               // auto-generated if omitted
  insurerCaseId?: string         // optional for manual creation
  insurancePolicyNumber?: string // optional for manual creation
  insuranceCompanyId: string     // required

  // Damage info
  damageType: string
  damageDescription: string
  buildingType: string

  // Location
  address: string
  postalCode: string
  city: string
  region: string
  gpsLat?: number
  gpsLng?: number

  // Contact
  contactName: string
  contactPhone: string
  contactEmail: string

  // Scheduling & scope
  priorityLevel?: string
  maxApprovedPrice?: number
  estimatedScope?: string
  slaCategory?: string
  requestedStartDate?: string
  requestedDeadline?: string

  // Assignment
  responsibleUserId?: string
}

/** Generate a unique claimId: SED-YYYY-XXXXXX */
function generateClaimId(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `SED-${year}-${rand}`
}

async function createProjectHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const body = (await req.json()) as CreateProjectBody

    // Validate required fields
    const required: (keyof CreateProjectBody)[] = [
      'insuranceCompanyId', 'damageType', 'damageDescription', 'buildingType',
      'address', 'postalCode', 'city', 'region',
      'contactName', 'contactPhone', 'contactEmail',
    ]
    const missing = required.filter((f) => !body[f])
    if (missing.length > 0) {
      return { status: 400, jsonBody: { error: `Manglende felter: ${missing.join(', ')}` } }
    }

    // Verify insurance company exists
    const insurer = await prisma.insuranceCompany.findUnique({
      where: { id: body.insuranceCompanyId },
    })
    if (!insurer) {
      return { status: 400, jsonBody: { error: 'Forsikringsselskab ikke fundet' } }
    }

    // Resolve claimId — use provided or auto-generate (with collision retry)
    let claimId = body.claimId?.trim()
    if (claimId) {
      const existing = await prisma.project.findUnique({ where: { claimId } })
      if (existing) {
        return { status: 409, jsonBody: { error: `claimId '${claimId}' er allerede i brug` } }
      }
    } else {
      // Auto-generate with up to 5 collision retries
      for (let i = 0; i < 5; i++) {
        const candidate = generateClaimId()
        const exists = await prisma.project.findUnique({ where: { claimId: candidate } })
        if (!exists) { claimId = candidate; break }
      }
      if (!claimId) {
        return { status: 500, jsonBody: { error: 'Kunne ikke generere unikt sag-ID' } }
      }
    }

    const project = await prisma.project.create({
      data: {
        claimId,
        insurerCaseId:         body.insurerCaseId         ?? '',
        insurancePolicyNumber: body.insurancePolicyNumber ?? '',
        insuranceCompanyId:    body.insuranceCompanyId,
        damageType:            body.damageType,
        damageDescription:     body.damageDescription,
        buildingType:          body.buildingType,
        address:               body.address,
        postalCode:            body.postalCode,
        city:                  body.city,
        region:                body.region,
        gpsLat:                body.gpsLat,
        gpsLng:                body.gpsLng,
        contactName:           body.contactName,
        contactPhone:          body.contactPhone,
        contactEmail:          body.contactEmail,
        priorityLevel:         body.priorityLevel         ?? 'NORMAL',
        maxApprovedPrice:      body.maxApprovedPrice,
        estimatedScope:        body.estimatedScope,
        slaCategory:           body.slaCategory,
        requestedStartDate:    body.requestedStartDate ? new Date(body.requestedStartDate) : undefined,
        requestedDeadline:     body.requestedDeadline  ? new Date(body.requestedDeadline)  : undefined,
        responsibleUserId:     body.responsibleUserId  ?? null,
        createdViaApi:         false,
      },
      include: {
        insuranceCompany: { select: { id: true, name: true } },
        responsibleUser:  { select: { id: true, fullName: true } },
      },
    })

    await writeAuditLog({
      userId:     jwtUser.sub,
      entityType: 'Project',
      entityId:   project.id,
      action:     'CREATE',
      newValue:   project,
    })

    // Seed project message thread with the creating admin + all insurer users
    const insurerUsers = await prisma.user.findMany({
      where: { insurerUser: { insuranceCompanyId: body.insuranceCompanyId } },
      select: { id: true },
    })
    await ensureProjectChannel(project.id, [jwtUser.sub, ...insurerUsers.map((u) => u.id)])

    return { status: 201, jsonBody: project }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'projects',
  handler: createProjectHandler,
})
