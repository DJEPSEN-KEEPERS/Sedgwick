import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function listInsurersHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const companies = await prisma.insuranceCompany.findMany({
      select: { id: true, name: true, externalReference: true, status: true },
      orderBy: { name: 'asc' },
    })

    return { status: 200, jsonBody: companies }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('insurers-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'insurers',
  handler: listInsurersHandler,
})
