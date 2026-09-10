import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { prisma } from '../../lib/prisma'
import { authenticate, requireRoles, errorResponse } from '../../middleware/authMiddleware'

async function sedgwickDashboardHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const jwtUser = authenticate(req)
    requireRoles(jwtUser, 'SEDGWICK_ADMIN')

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000)

    const [
      activeProjects,
      newThisWeek,
      bidsAwaiting,
      urgentBids,
      pendingApprovalCount,
      slaProjects,
      recentProjects,
      pendingStatusUpdates,
      pendingFinalReports,
      recentMessages,
      topContractors,
    ] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.project.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.bidInvitation.count({ where: { status: 'PENDING' } }),
      prisma.bidInvitation.count({
        where: { status: 'PENDING', project: { priorityLevel: { in: ['HIGH', 'URGENT'] } } },
      }),
      prisma.entrepriseStatusUpdate.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.project.findMany({
        where: {
          status: 'ACTIVE',
          requestedDeadline: { lt: now },
        },
        include: {
          insuranceCompany: { select: { id: true, name: true } },
          selectedContractor: { select: { id: true, companyName: true } },
          entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
        },
        orderBy: { requestedDeadline: 'asc' },
        take: 5,
      }),
      prisma.project.findMany({
        include: {
          insuranceCompany: { select: { id: true, name: true } },
          selectedContractor: { select: { id: true, companyName: true } },
          entreprises: { select: { id: true, type: true, currentMilestone: true, progressPercent: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.entrepriseStatusUpdate.findMany({
        where: { approvalStatus: 'PENDING' },
        include: {
          entreprise: {
            include: {
              project: { select: { id: true, claimId: true } },
              contractor: { select: { companyName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      prisma.finalReport.findMany({
        where: { approvalStatus: 'PENDING' },
        include: {
          entreprise: {
            include: {
              project: { select: { id: true, claimId: true } },
              contractor: { select: { companyName: true } },
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
        take: 10,
      }),
      prisma.chatMessage.findMany({
        where: { channel: { channelType: 'PROJECT' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          sender: { select: { fullName: true, role: true } },
          channel: {
            select: {
              id: true,
              projectId: true,
              project: { select: { claimId: true } },
            },
          },
        },
      }),
      prisma.contractor.findMany({
        select: {
          id: true,
          companyName: true,
          sedgwickRatingAvg: true,
          currentWorkload: true,
          maxParallelProjects: true,
        },
        orderBy: { sedgwickRatingAvg: 'desc' },
        take: 5,
      }),
    ])

    const oldestPending = await prisma.entrepriseStatusUpdate.findFirst({
      where: { approvalStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    const oldestApprovalDays = oldestPending
      ? Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / 86400000)
      : 0

    const pendingItems = [
      ...pendingStatusUpdates.map((u: any) => ({
        type: 'statusUpdate' as const,
        id: u.id,
        projectClaimId: u.entreprise.project.claimId,
        entrepriseType: u.entreprise.type,
        contractorName: u.entreprise.contractor?.companyName ?? '—',
        submittedAt: u.createdAt.toISOString(),
        milestone: u.milestone,
        progressPercent: u.progressPercent,
        comments: u.comments ?? undefined,
      })),
      ...pendingFinalReports.map((r: any) => ({
        type: 'finalReport' as const,
        id: r.id,
        projectClaimId: r.entreprise.project.claimId,
        entrepriseType: r.entreprise.type,
        contractorName: r.entreprise.contractor?.companyName ?? '—',
        submittedAt: (r.submittedAt ?? r.createdAt).toISOString(),
      })),
    ].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())

    const recentMessagesFormatted = recentMessages.map((m: any) => ({
      id: m.id,
      channelId: m.channelId,
      projectId: m.channel.projectId,
      claimId: m.channel.project.claimId,
      senderName: m.sender.fullName,
      senderRole: m.sender.role,
      messageBody: m.messageBody,
      createdAt: m.createdAt.toISOString(),
    }))

    return {
      status: 200,
      jsonBody: {
        stats: {
          activeProjects,
          newThisWeek,
          bidsAwaiting,
          urgentBids,
          pendingApprovals: pendingApprovalCount,
          oldestApprovalDays,
          slaBreaches: slaProjects.length,
        },
        recentProjects,
        pendingItems,
        slaProjects,
        recentMessages: recentMessagesFormatted,
        topContractors,
      },
    }
  } catch (err) {
    return errorResponse(err, context)
  }
}

app.http('sedgwick-dashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: sedgwickDashboardHandler,
})
