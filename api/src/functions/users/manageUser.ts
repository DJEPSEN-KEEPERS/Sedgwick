import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

// ── PATCH /users/{userId} ─────────────────────────────────────────────────────

interface UpdateUserBody {
  fullName?: string
  email?: string
  phone?: string
  status?: string
  password?: string
  insuranceCompanyId?: string
  contractorId?: string
}

async function updateUserHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { userId } = req.params
    const body = (await req.json()) as UpdateUserBody

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } }
    }

    // Guard: cannot edit own account's status (prevent self-lockout)
    if (userId === jwtUser.sub && body.status && body.status !== 'ACTIVE') {
      return { status: 400, jsonBody: { error: 'Du kan ikke ændre din egen status' } }
    }

    // Email uniqueness check
    if (body.email?.trim() && body.email.trim().toLowerCase() !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } })
      if (taken) {
        return { status: 409, jsonBody: { error: 'E-mail er allerede i brug' } }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.fullName?.trim()) updateData.fullName = body.fullName.trim()
    if (body.email?.trim())    updateData.email    = body.email.trim().toLowerCase()
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null
    if (body.status)           updateData.status   = body.status
    if (body.password?.trim()) updateData.passwordHash = await bcrypt.hash(body.password.trim(), 12)

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        status: true, createdAt: true, lastLoginAt: true,
        insurerUser:    { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
        contractorUser: { select: { contractorId: true,      contractor:       { select: { companyName: true } } } },
      },
    })

    // Update association if provided
    if (existing.role === 'INSURER_USER' && body.insuranceCompanyId) {
      await prisma.insuranceCompanyUser.upsert({
        where:  { userId },
        update: { insuranceCompanyId: body.insuranceCompanyId },
        create: { userId, insuranceCompanyId: body.insuranceCompanyId },
      })
    }
    if (existing.role === 'CONTRACTOR_USER' && body.contractorId) {
      await prisma.contractorUser.upsert({
        where:  { userId },
        update: { contractorId: body.contractorId },
        create: { userId, contractorId: body.contractorId },
      })
    }

    // Re-fetch to return fresh association data
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        status: true, createdAt: true, lastLoginAt: true,
        insurerUser:    { select: { insuranceCompanyId: true, insuranceCompany: { select: { name: true } } } },
        contractorUser: { select: { contractorId: true,      contractor:       { select: { companyName: true } } } },
      },
    })

    return { status: 200, jsonBody: fresh }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── DELETE /users/{userId} ────────────────────────────────────────────────────

async function deleteUserHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const { userId } = req.params

    if (userId === jwtUser.sub) {
      return { status: 400, jsonBody: { error: 'Du kan ikke slette din egen konto' } }
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Bruger ikke fundet' } }
    }

    // Attempt clean deletion in a transaction:
    // 1. Nullify responsibleUserId on projects
    // 2. Delete notification preferences and notifications
    // 3. Delete audit logs for this user
    // 4. Delete InsuranceCompanyUser / ContractorUser links
    // 5. Delete the user itself
    //
    // If the user has chat messages, status updates, bids etc. the delete
    // will fail with a FK constraint — we return 409 so the UI can offer
    // deactivation instead.
    try {
      await prisma.$transaction([
        prisma.project.updateMany({
          where: { responsibleUserId: userId },
          data:  { responsibleUserId: null },
        }),
        prisma.notificationPreference.deleteMany({ where: { userId } }),
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } }),
        ...(existing.role === 'INSURER_USER'
          ? [prisma.insuranceCompanyUser.deleteMany({ where: { userId } })]
          : []),
        ...(existing.role === 'CONTRACTOR_USER'
          ? [prisma.contractorUser.deleteMany({ where: { userId } })]
          : []),
        prisma.user.delete({ where: { id: userId } }),
      ])

      return { status: 200, jsonBody: { deleted: true } }
    } catch {
      // FK constraint — user has data (chat messages, bids, status updates, etc.)
      return {
        status: 409,
        jsonBody: {
          error: 'Brugeren har tilknyttede data og kan ikke slettes permanent',
          canDeactivate: true,
        },
      }
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

app.http('users-update', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'users/{userId}',
  handler: updateUserHandler,
})

app.http('users-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'users/{userId}',
  handler: deleteUserHandler,
})
