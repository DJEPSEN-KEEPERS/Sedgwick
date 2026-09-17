import { prisma } from './prisma'
import { sendNotificationEmail } from './email'

interface CreateNotificationOptions {
  userId: string
  eventType: string
  title: string
  message: string
}

// Creates an IN_APP notification (if preference allows) and sends an email
// via ACS (if the EMAIL preference is enabled and the user has an email address).
export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: opts.userId, eventType: opts.eventType },
    })
    const isDisabled = (channel: string) =>
      prefs.some((p) => p.channel === channel && !p.enabled)

    // IN_APP
    if (!isDisabled('IN_APP')) {
      await prisma.notification.create({
        data: {
          userId: opts.userId,
          eventType: opts.eventType,
          channel: 'IN_APP',
          title: opts.title,
          message: opts.message,
          status: 'pending',
        },
      })
    }

    // EMAIL
    if (!isDisabled('EMAIL')) {
      const user = await prisma.user.findUnique({
        where: { id: opts.userId },
        select: { email: true, fullName: true },
      })
      if (user) {
        sendNotificationEmail({
          toEmail: user.email,
          fullName: user.fullName,
          title: opts.title,
          message: opts.message,
        })
      }
    }
  } catch {
    // Notifications are best-effort — never throw
  }
}

// ── Insurer helpers ───────────────────────────────────────────────────────────

async function notifyInsurerUsers(
  projectId: string,
  eventType: string,
  title: string,
  message: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      insuranceCompany: {
        select: {
          users: { select: { userId: true } },
        },
      },
    },
  })
  const userIds = project?.insuranceCompany?.users.map((u) => u.userId) ?? []
  await Promise.all(
    userIds.map((userId) => createNotification({ userId, eventType, title, message })),
  )
}

export async function notifyInsurerBidReceived(projectId: string, claimId: string): Promise<void> {
  await notifyInsurerUsers(
    projectId,
    'BID_RECEIVED',
    'Nyt tilbud modtaget',
    `Der er modtaget et nyt tilbud på sag ${claimId}.`,
  )
}

export async function notifyInsurerStatusUpdateApproved(projectId: string, claimId: string): Promise<void> {
  await notifyInsurerUsers(
    projectId,
    'STATUS_UPDATE',
    'Statusopdatering godkendt',
    `En statusopdatering på sag ${claimId} er godkendt af Sedgwick.`,
  )
}

export async function notifyInsurerFinalReportApproved(projectId: string, claimId: string): Promise<void> {
  await notifyInsurerUsers(
    projectId,
    'FINAL_REPORT_SUBMITTED',
    'Slutrapport godkendt',
    `Slutrapporten for sag ${claimId} er godkendt af Sedgwick.`,
  )
}

// ── Contractor helpers ────────────────────────────────────────────────────────

export async function notifyContractorBidSelected(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u: any) =>
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

export async function notifyContractorBidNotSelected(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u: any) =>
      createNotification({
        userId: u.userId,
        eventType: 'BID_NOT_SELECTED',
        title: 'Dit tilbud er ikke valgt',
        message: `Dit tilbud på sag ${projectClaimId} er ikke valgt — en anden håndværker er tildelt opgaven.`,
      }),
    ),
  )
}

export async function notifyContractorInvitationClosed(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u: any) =>
      createNotification({
        userId: u.userId,
        eventType: 'INVITATION_CLOSED',
        title: 'Invitation lukket',
        message: `Sag ${projectClaimId} er tildelt en anden håndværker. Invitationen er nu lukket.`,
      }),
    ),
  )
}

export async function notifyNewInvitation(contractorId: string, projectClaimId: string): Promise<void> {
  const users = await prisma.contractorUser.findMany({
    where: { contractorId },
    select: { userId: true },
  })
  await Promise.all(
    users.map((u: any) =>
      createNotification({
        userId: u.userId,
        eventType: 'NEW_INVITATION',
        title: 'Ny invitation',
        message: `Du er inviteret til at byde på sag ${projectClaimId}.`,
      }),
    ),
  )
}
