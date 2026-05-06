import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listSkillsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const skills = await prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return { status: 200, jsonBody: skills }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('skills-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'skills',
  handler: listSkillsHandler,
})
