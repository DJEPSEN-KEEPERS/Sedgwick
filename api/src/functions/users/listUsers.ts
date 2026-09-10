import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'
import { sendWelcomeEmail } from '../../lib/email'

// ── GET /users ────────────────────────────────────────────────────────────────

async function listUsersHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        insurerUser:    { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
        contractorUser: { select: { contractorId: true,      contractor:       { select: { companyName: true } } } },
      },
      orderBy: { fullName: 'asc' },
    })

    return { status: 200, jsonBody: users }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── POST /users ───────────────────────────────────────────────────────────────

interface CreateUserBody {
  fullName: string
  email: string
  role: 'SEDGWICK_ADMIN' | 'INSURER_USER' | 'CONTRACTOR_USER'
  password: string
  phone?: string
  insuranceCompanyId?: string
  contractorId?: string
}

async function createUserHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const body = (await req.json()) as CreateUserBody

    if (!body.fullName || !body.email || !body.role || !body.password) {
      return { status: 400, jsonBody: { error: 'fullName, email, role og password er påkrævet' } }
    }
    if (!['SEDGWICK_ADMIN', 'INSURER_USER', 'CONTRACTOR_USER'].includes(body.role)) {
      return { status: 400, jsonBody: { error: 'Ugyldig rolle' } }
    }
    if (body.role === 'INSURER_USER' && !body.insuranceCompanyId) {
      return { status: 400, jsonBody: { error: 'insuranceCompanyId er påkrævet for forsikringsbrugere' } }
    }
    if (body.role === 'CONTRACTOR_USER' && !body.contractorId) {
      return { status: 400, jsonBody: { error: 'contractorId er påkrævet for håndværkerbrugere' } }
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } })
    if (existing) {
      return { status: 409, jsonBody: { error: 'E-mail er allerede i brug' } }
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase().trim(),
        fullName: body.fullName.trim(),
        role: body.role,
        passwordHash,
        phone: body.phone?.trim() ?? null,
        twoFactorEnabled: false,
        status: 'ACTIVE',
      },
    })

    let companyName: string | undefined

    if (body.role === 'INSURER_USER' && body.insuranceCompanyId) {
      await prisma.insuranceCompanyUser.create({
        data: { userId: user.id, insuranceCompanyId: body.insuranceCompanyId },
      })
      const insurer = await prisma.insuranceCompany.findUnique({
        where: { id: body.insuranceCompanyId },
        select: { name: true },
      })
      companyName = insurer?.name
    } else if (body.role === 'CONTRACTOR_USER' && body.contractorId) {
      await prisma.contractorUser.create({
        data: { userId: user.id, contractorId: body.contractorId },
      })
      const contractor = await prisma.contractor.findUnique({
        where: { id: body.contractorId },
        select: { companyName: true },
      })
      companyName = contractor?.companyName
    }

    // Send welcome e-mail (fire-and-forget — never blocks the response)
    sendWelcomeEmail({
      toEmail:     user.email,
      fullName:    user.fullName,
      role:        user.role,
      password:    body.password,
      companyName,
    })

    return {
      status: 201,
      jsonBody: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── Single registration for both methods ──────────────────────────────────────

app.http('users', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: (req, ctx) =>
    req.method === 'POST' ? createUserHandler(req, ctx) : listUsersHandler(req, ctx),
})
