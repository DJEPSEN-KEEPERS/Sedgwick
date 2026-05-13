"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyContractorBidSelected = notifyContractorBidSelected;
exports.notifyStatusUpdateReviewed = notifyStatusUpdateReviewed;
exports.notifyFinalReportReviewed = notifyFinalReportReviewed;
exports.notifyNewInvitation = notifyNewInvitation;
const prisma_1 = require("./prisma");
async function createNotification(opts) {
    try {
        // Check if user has disabled this notification type
        const pref = await prisma_1.prisma.notificationPreference.findFirst({
            where: {
                userId: opts.userId,
                channel: opts.channel ?? 'IN_APP',
                eventType: opts.eventType,
            },
        });
        if (pref && !pref.enabled)
            return;
        await prisma_1.prisma.notification.create({
            data: {
                userId: opts.userId,
                eventType: opts.eventType,
                channel: opts.channel ?? 'IN_APP',
                title: opts.title,
                message: opts.message,
                status: 'pending',
            },
        });
    }
    catch {
        // Notifications are best-effort — never throw
    }
}
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
