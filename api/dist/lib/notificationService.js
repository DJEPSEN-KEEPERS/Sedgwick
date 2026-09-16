"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyInsurerBidReceived = notifyInsurerBidReceived;
exports.notifyInsurerStatusUpdateApproved = notifyInsurerStatusUpdateApproved;
exports.notifyInsurerFinalReportApproved = notifyInsurerFinalReportApproved;
exports.notifyContractorBidSelected = notifyContractorBidSelected;
exports.notifyStatusUpdateReviewed = notifyStatusUpdateReviewed;
exports.notifyFinalReportReviewed = notifyFinalReportReviewed;
exports.notifyNewInvitation = notifyNewInvitation;
const prisma_1 = require("./prisma");
const email_1 = require("./email");
// Creates an IN_APP notification (if preference allows) and sends an email
// via ACS (if the EMAIL preference is enabled and the user has an email address).
async function createNotification(opts) {
    try {
        const prefs = await prisma_1.prisma.notificationPreference.findMany({
            where: { userId: opts.userId, eventType: opts.eventType },
        });
        const isDisabled = (channel) => prefs.some((p) => p.channel === channel && !p.enabled);
        // IN_APP
        if (!isDisabled('IN_APP')) {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: opts.userId,
                    eventType: opts.eventType,
                    channel: 'IN_APP',
                    title: opts.title,
                    message: opts.message,
                    status: 'pending',
                },
            });
        }
        // EMAIL
        if (!isDisabled('EMAIL')) {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: opts.userId },
                select: { email: true, fullName: true },
            });
            if (user) {
                (0, email_1.sendNotificationEmail)({
                    toEmail: user.email,
                    fullName: user.fullName,
                    title: opts.title,
                    message: opts.message,
                });
            }
        }
    }
    catch {
        // Notifications are best-effort — never throw
    }
}
// ── Insurer helpers ───────────────────────────────────────────────────────────
async function notifyInsurerUsers(projectId, eventType, title, message) {
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        select: {
            insuranceCompany: {
                select: {
                    users: { select: { userId: true } },
                },
            },
        },
    });
    const userIds = project?.insuranceCompany?.users.map((u) => u.userId) ?? [];
    await Promise.all(userIds.map((userId) => createNotification({ userId, eventType, title, message })));
}
async function notifyInsurerBidReceived(projectId, claimId) {
    await notifyInsurerUsers(projectId, 'BID_RECEIVED', 'Nyt tilbud modtaget', `Der er modtaget et nyt tilbud på sag ${claimId}.`);
}
async function notifyInsurerStatusUpdateApproved(projectId, claimId) {
    await notifyInsurerUsers(projectId, 'STATUS_UPDATE', 'Statusopdatering godkendt', `En statusopdatering på sag ${claimId} er godkendt af Sedgwick.`);
}
async function notifyInsurerFinalReportApproved(projectId, claimId) {
    await notifyInsurerUsers(projectId, 'FINAL_REPORT_SUBMITTED', 'Slutrapport godkendt', `Slutrapporten for sag ${claimId} er godkendt af Sedgwick.`);
}
// ── Contractor helpers ────────────────────────────────────────────────────────
async function notifyContractorBidSelected(contractorId, projectClaimId) {
    const users = await prisma_1.prisma.contractorUser.findMany({
        where: { contractorId },
        select: { userId: true },
    });
    await Promise.all(users.map((u) => createNotification({
        userId: u.userId,
        eventType: 'BID_SELECTED',
        title: 'Dit bud er valgt',
        message: `Du er valgt som håndværker til sag ${projectClaimId}.`,
    })));
}
async function notifyStatusUpdateReviewed(submittedByUserId, approved, projectClaimId) {
    await createNotification({
        userId: submittedByUserId,
        eventType: approved ? 'STATUS_UPDATE_APPROVED' : 'STATUS_UPDATE_REJECTED',
        title: approved ? 'Statusopdatering godkendt' : 'Statusopdatering afvist',
        message: `Din statusopdatering for sag ${projectClaimId} er ${approved ? 'godkendt' : 'afvist'}.`,
    });
}
async function notifyFinalReportReviewed(submittedByUserId, approved, projectClaimId) {
    await createNotification({
        userId: submittedByUserId,
        eventType: approved ? 'FINAL_REPORT_APPROVED' : 'FINAL_REPORT_REJECTED',
        title: approved ? 'Slutrapport godkendt' : 'Slutrapport afvist',
        message: `Din slutrapport for sag ${projectClaimId} er ${approved ? 'godkendt' : 'afvist'}.`,
    });
}
async function notifyNewInvitation(contractorId, projectClaimId) {
    const users = await prisma_1.prisma.contractorUser.findMany({
        where: { contractorId },
        select: { userId: true },
    });
    await Promise.all(users.map((u) => createNotification({
        userId: u.userId,
        eventType: 'NEW_INVITATION',
        title: 'Ny invitation',
        message: `Du er inviteret til at byde på sag ${projectClaimId}.`,
    })));
}
