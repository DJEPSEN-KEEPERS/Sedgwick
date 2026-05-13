import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (_req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    return {
      status: 200,
      jsonBody: { ok: true, timestamp: new Date().toISOString() },
    }
  },
})
