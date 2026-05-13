"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = getRecommendations;
const prisma_1 = require("./prisma");
async function getRecommendations(projectId) {
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            requiredSkills: { include: { skill: true } },
            bidInvitations: { select: { contractorId: true } },
        },
    });
    if (!project) {
        throw new Error('Project not found');
    }
    const invitedContractorIds = new Set(project.bidInvitations.map((i) => i.contractorId));
    const projectSkillIds = new Set(project.requiredSkills.map((rs) => rs.skillId));
    const contractors = await prisma_1.prisma.contractor.findMany({
        where: { status: 'active' },
        include: {
            regions: true,
            skills: { include: { skill: true } },
        },
    });
    const results = [];
    for (const contractor of contractors) {
        if (invitedContractorIds.has(contractor.id))
            continue;
        const matchReasons = [];
        // Region match: +40 pts if contractor covers project region
        const regionMatch = contractor.regions.some((r) => r.regionName === project.region) ? 40 : 0;
        if (regionMatch > 0)
            matchReasons.push(`Dækker region: ${project.region}`);
        // Skill match: min(matchingSkills * 15, 30)
        const contractorSkillIds = new Set(contractor.skills.map((cs) => cs.skillId));
        const matchingSkillCount = [...projectSkillIds].filter((id) => contractorSkillIds.has(id)).length;
        const skillMatch = Math.min(matchingSkillCount * 15, 30);
        if (skillMatch > 0) {
            const matchedSkillNames = contractor.skills
                .filter((cs) => projectSkillIds.has(cs.skillId))
                .map((cs) => cs.skill.name);
            matchReasons.push(`Matcher ${matchingSkillCount} kompetence(r): ${matchedSkillNames.join(', ')}`);
        }
        // Rating: (sedgwickRatingAvg / 5) * 20
        const ratingScore = (contractor.sedgwickRatingAvg / 5) * 20;
        if (contractor.sedgwickRatingAvg > 0) {
            matchReasons.push(`Sedgwick-vurdering: ${contractor.sedgwickRatingAvg.toFixed(1)}/5`);
        }
        // Workload penalty
        const capacityUsed = contractor.maxParallelProjects > 0
            ? contractor.currentWorkload / contractor.maxParallelProjects
            : 1;
        const workloadPenalty = capacityUsed > 0.5 ? Math.floor((capacityUsed - 0.5) * 10) * 5 : 0;
        if (workloadPenalty > 0) {
            matchReasons.push(`Kapacitetsstraf: -${workloadPenalty} (${Math.round(capacityUsed * 100)}% belastet)`);
        }
        const totalScore = regionMatch + skillMatch + ratingScore - workloadPenalty;
        results.push({
            contractorId: contractor.id,
            companyName: contractor.companyName,
            totalScore,
            breakdown: { regionMatch, skillMatch, ratingScore, workloadPenalty },
            matchReasons,
        });
    }
    results.sort((a, b) => b.totalScore - a.totalScore);
    const top10 = results.slice(0, 10);
    // Replace existing recommendations for this project with fresh top-10
    await prisma_1.prisma.contractorRecommendation.deleteMany({ where: { projectId } });
    if (top10.length > 0) {
        await prisma_1.prisma.contractorRecommendation.createMany({
            data: top10.map((result) => ({
                projectId,
                contractorId: result.contractorId,
                matchScore: result.totalScore,
                matchReason: result.matchReasons.join('; '),
            })),
        });
    }
    return top10;
}
