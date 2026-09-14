import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, errorResponse } from '../../middleware/authMiddleware'

async function listProjectsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)

    const url = new URL(req.url)
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50')))
    const status   = url.searchParams.get('status')   ?? undefined
    const search   = url.searchParams.get('search')   ?? undefined
    const priority = url.searchParams.get('priority') ?? undefined

    // ── Scope by role ─────────────────────────────────────────────────────────
    if (jwtUser.role === 'INSURER_USER' && !jwtUser.linkedEntityId) {
      return { status: 200, jsonBody: [] }
    }
    if (jwtUser.role === 'CONTRACTOR_USER' && !jwtUser.linkedEntityId) {
      return { status: 200, jsonBody: [] }
    }

    const scopeWhere =
      jwtUser.role === 'INSURER_USER'
        ? { insuranceCompanyId: jwtUser.linkedEntityId! }
        : jwtUser.role === 'CONTRACTOR_USER'
          ? { selectedContractorId: jwtUser.linkedEntityId! }
          : {}

    // ── Build combined where ──────────────────────────────────────────────────
    const where = {
      ...scopeWhere,
      ...(status   ? { status }   : {}),
      ...(priority ? { priorityLevel: priority } : {}),
      ...(search
        ? {
            OR: [
              { claimId:      { contains: search } },
              { address:      { contains: search } },
              { city:         { contains: search } },
              { damageType:   { contains: search } },
              { contactName:  { contains: search } },
            ],
          }
        : {}),
    }

    const STALE_BIDDING_DAYS = 5

    const projects = await prisma.project.findMany({
      where,
      include: {
        insuranceCompany:   { select: { id: true, name: true } },
        selectedContractor: { select: { id: true, companyName: true } },
        responsibleUser:    { select: { id: true, fullName: true, email: true } },
        entreprises:        { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
        bidInvitations:     { select: { invitedAt: true } },
        bids:               { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: pageSize,
    })

    const now = Date.now()
    const enriched = projects.map((p: any) => {
      const hasAnyBid = p.bids.length > 0
      let daysSinceFirstInvitation: number | undefined
      if (p.currentMilestone === 'BIDDING_IN_PROGRESS' && p.bidInvitations.length > 0) {
        const oldest = Math.min(...p.bidInvitations.map((i: any) => new Date(i.invitedAt).getTime()))
        daysSinceFirstInvitation = Math.floor((now - oldest) / 86400000)
      }
      const { bidInvitations, bids, ...rest } = p
      return { ...rest, hasAnyBid, daysSinceFirstInvitation, staleBiddingDaysThreshold: STALE_BIDDING_DAYS }
    })

    return { status: 200, jsonBody: enriched }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('projects-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects',
  handler: listProjectsHandler,
})
