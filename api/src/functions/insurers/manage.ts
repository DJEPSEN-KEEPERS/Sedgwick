import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

// ── POST /insurers ────────────────────────────────────────────────────────────

interface CreateInsurerBody {
  name: string
  externalReference?: string
}

async function createInsurerHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const body = (await req.json()) as CreateInsurerBody

    if (!body.name?.trim()) {
      return { status: 400, jsonBody: { error: 'Navn er påkrævet' } }
    }

    if (body.externalReference?.trim()) {
      const existing = await prisma.insuranceCompany.findUnique({
        where: { externalReference: body.externalReference.trim() },
      })
      if (existing) {
        return { status: 409, jsonBody: { error: 'Ekstern reference er allerede i brug' } }
      }
    }

    const apiKey = randomBytes(32).toString('hex')

    const company = await prisma.insuranceCompany.create({
      data: {
        name: body.name.trim(),
        externalReference: body.externalReference?.trim() || null,
        apiKey,
        status: 'active',
      },
      select: { id: true, name: true, externalReference: true, status: true, createdAt: true },
    })

    return { status: 201, jsonBody: company }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── PATCH /insurers/{insurerId} ───────────────────────────────────────────────

interface UpdateInsurerBody {
  name?: string
  externalReference?: string
  status?: string
}

async function updateInsurerHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { insurerId } = req.params
    const body = (await req.json()) as UpdateInsurerBody

    const existing = await prisma.insuranceCompany.findUnique({ where: { id: insurerId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Forsikringsselskab ikke fundet' } }
    }

    if (body.externalReference?.trim() && body.externalReference.trim() !== existing.externalReference) {
      const conflict = await prisma.insuranceCompany.findUnique({
        where: { externalReference: body.externalReference.trim() },
      })
      if (conflict) {
        return { status: 409, jsonBody: { error: 'Ekstern reference er allerede i brug' } }
      }
    }

    const updated = await prisma.insuranceCompany.update({
      where: { id: insurerId },
      data: {
        ...(body.name?.trim()               ? { name: body.name.trim() }                              : {}),
        ...(body.externalReference !== undefined ? { externalReference: body.externalReference?.trim() || null } : {}),
        ...(body.status                     ? { status: body.status }                                 : {}),
      },
      select: { id: true, name: true, externalReference: true, status: true, createdAt: true },
    })

    return { status: 200, jsonBody: updated }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── Single registration ───────────────────────────────────────────────────────

app.http('insurers-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'insurers',
  handler: createInsurerHandler,
})

app.http('insurers-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'insurers/{insurerId}',
  handler: updateInsurerHandler,
})
