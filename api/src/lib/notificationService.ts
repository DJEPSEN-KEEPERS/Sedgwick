import { prisma } from './prisma'

interface CreateNotificationOptions {
  userId: string
  eventType: string
  title: string
  message: string
  channel?: string
}

export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  try {
    // Check if user has disabled this notification type
    const pref = await prisma.notificationPreference.findFirst({
      where: {
        userId: opts.userId,
        channel: opts.channel ?? 'IN_APP',
        eventType: opts.eventType,
      },
    })

    if (pref && !pref.enabled) return

    await prisma.notification.create({
      data: {
        userId: opts.userId,
        eventType: opts.eventType,
        channel: opts.channel ?? 'IN_APP',
        title: opts.title,
        message: opts.message,
        status: 'pending',
      },
    })
  } catch {
    // Notifications are best-effort — never throw
  }
}

export async function notifyContractorBidSelected(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u) =>
      createNotification({
        userId: u.userId,
        eventType: 'BID_SELECTED',
        title: 'Dit bud er valgt',
        message: `Du er valgt som håndværker til sag ${projectClaimId}.`,
      }),
    ),
  )
}

export async function notifyStatusUpdateReviewed(
  submittedByUserId: string,
  approved: boolean,
  projectClaimId: string,
): Promise<void> {
  await createNotification({
    userId: submittedByUserId,
    eventType: approved ? 'STATUS_UPDATE_APPROVED' : 'STATUS_UPDATE_REJECTED',
    title: approved ? 'Statusopdatering godkendt' : 'Statusopdatering afvist',
    message: `Din statusopdatering for sag ${projectClaimId} er ${approved ? 'godkendt' : 'afvist'}.`,
  })
}

export async function notifyFinalReportReviewed(
  submittedByUserId: string,
  approved: boolean,
  projectClaimId: string,
): Promise<void> {
  await createNotification({
    userId: submittedByUserId,
    eventType: approved ? 'FINAL_REPORT_APPROVED' : 'FINAL_REPORT_REJECTED',
    title: approved ? 'Slutrapport godkendt' : 'Slutrapport afvist',
    message: `Din slutrapport for sag ${projectClaimId} er ${approved ? 'godkendt' : 'afvist'}.`,
  })
}

export async function notifyNewInvitation(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u) =>
      createNotification({
        userId: u.userId,
        eventType: 'NEW_INVITATION',
        title: 'Ny invitation',
        message: `Du er inviteret til at byde på sag ${projectClaimId}.`,
      }),
    ),
  )
}
