import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listContractorsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const url = new URL(req.url)
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50')))
    const search = url.searchParams.get('search') ?? undefined
    const region = url.searchParams.get('region') ?? undefined

    const where = {
      ...(search
        ? {
            OR: [
              { companyName: { contains: search } },
              { contactName: { contains: search } },
              { cvrNumber: { contains: search } },
            ],
          }
        : {}),
      ...(region ? { regions: { some: { regionName: region } } } : {}),
    }

    const contractors = await prisma.contractor.findMany({
      where,
      include: {
        regions: true,
        skills: { include: { skill: true } },
        certifications: true,
      },
      orderBy: { companyName: 'asc' },
      take: pageSize,
    })

    return { status: 200, jsonBody: contractors }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('contractors-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contractors',
  handler: listContractorsHandler,
})
