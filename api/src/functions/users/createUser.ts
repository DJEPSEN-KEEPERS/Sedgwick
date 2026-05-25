import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

interface CreateUserBody {
  fullName: string
  email: string
  role: 'SEDGWICK_ADMIN' | 'INSURER_USER' | 'CONTRACTOR_USER'
  password: string
  phone?: string
  insuranceCompanyId?: string // required when role = INSURER_USER
  contractorId?: string       // required when role = CONTRACTOR_USER
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
        fullName: body.fullName,
        role: body.role,
        passwordHash,
        phone: body.phone ?? null,
        twoFactorEnabled: false,
        status: 'ACTIVE',
      },
    })

    // Create the role-specific link record
    if (body.role === 'INSURER_USER' && body.insuranceCompanyId) {
      await prisma.insuranceCompanyUser.create({
        data: { userId: user.id, insuranceCompanyId: body.insuranceCompanyId },
      })
    } else if (body.role === 'CONTRACTOR_USER' && body.contractorId) {
      await prisma.contractorUser.create({
        data: { userId: user.id, contractorId: body.contractorId },
      })
    }

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

app.http('users-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: createUserHandler,
})
