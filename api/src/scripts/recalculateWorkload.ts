/**
 * One-time script: recalculate currentWorkload for all contractors
 * based on the actual number of ACTIVE projects where they are selected.
 *
 * Run with: npx ts-node --esm src/scripts/recalculateWorkload.ts
 * (or via tsx: npx tsx src/scripts/recalculateWorkload.ts)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const contractors = await prisma.contractor.findMany({ select: { id: true, companyName: true, currentWorkload: true } })

  let updated = 0
  for (const c of contractors) {
    const activeCount = await prisma.project.count({
      where: {
        selectedContractorId: c.id,
        status: 'ACTIVE',
        currentMilestone: { notIn: ['CASE_CLOSED', 'CASE_INVOICED'] },
      },
    })

    if (activeCount !== c.currentWorkload) {
      await prisma.contractor.update({
        where: { id: c.id },
        data: { currentWorkload: activeCount },
      })
      console.log(`${c.companyName}: ${c.currentWorkload} → ${activeCount}`)
      updated++
    }
  }

  console.log(`\nFærdig. ${updated} af ${contractors.length} håndværkere opdateret.`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
