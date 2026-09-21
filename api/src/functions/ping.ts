import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../lib/prisma'

async function pingHandler(_req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const start = Date.now()
  await prisma.$queryRaw`SELECT 1`
  return {
    status: 200,
    jsonBody: { ok: true, ms: Date.now() - start },
  }
}

app.http('ping', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ping',
  handler: pingHandler,
})
