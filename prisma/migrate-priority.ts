/**
 * One-time migration: normalise all legacy priority values to NORMAL.
 * Safe to run multiple times (idempotent).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "Project"
    SET "priorityLevel" = 'NORMAL'
    WHERE "priorityLevel" NOT IN ('NORMAL', 'FASTTRACK')
  `
  console.log(`Priority migration complete — ${result} row(s) updated`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
