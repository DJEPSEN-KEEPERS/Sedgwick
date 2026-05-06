import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateTotpSecret, encryptSecret } from '../api/src/lib/totp'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash('Sedgwick2024!', 12)
  const totpSecret = encryptSecret(generateTotpSecret())

  // Sedgwick admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sedgwick.dk' },
    update: {},
    create: {
      email: 'admin@sedgwick.dk',
      fullName: 'Sedgwick Admin',
      role: 'SEDGWICK_ADMIN',
      passwordHash,
      twoFactorEnabled: true,
      twoFactorMethod: 'TOTP',
      twoFactorSecret: totpSecret,
      phone: '+45 70 12 34 56',
    },
  })

  // Insurance company
  const insurer = await prisma.insuranceCompany.upsert({
    where: { apiKey: 'tryg-api-key-dev' },
    update: {},
    create: {
      name: 'Tryg Forsikring',
      externalReference: 'TRYG-001',
      apiKey: 'tryg-api-key-dev',
      status: 'active',
    },
  })

  // Insurer user
  const insurerUser = await prisma.user.upsert({
    where: { email: 'case@tryg.dk' },
    update: {},
    create: {
      email: 'case@tryg.dk',
      fullName: 'Tryg Sagsbehandler',
      role: 'INSURER_USER',
      passwordHash,
      twoFactorEnabled: true,
      twoFactorMethod: 'TOTP',
      twoFactorSecret: totpSecret,
    },
  })

  await prisma.insuranceCompanyUser.upsert({
    where: { userId: insurerUser.id },
    update: {},
    create: {
      userId: insurerUser.id,
      insuranceCompanyId: insurer.id,
    },
  })

  // Contractor
  const contractor = await prisma.contractor.upsert({
    where: { cvrNumber: '12345678' },
    update: {},
    create: {
      companyName: 'Hansen Tømrer & Byg A/S',
      cvrNumber: '12345678',
      contactName: 'Peter Hansen',
      contactEmail: 'peter@hansenbYG.dk',
      contactPhone: '+45 40 12 34 56',
      description: 'Specialiseret i vandskader og genopbygning',
      maxParallelProjects: 8,
      currentWorkload: 3,
      sedgwickRatingAvg: 4.7,
      clientRatingAvg: 4.5,
      regions: {
        create: [{ regionName: 'Sjælland' }, { regionName: 'Fyn' }],
      },
    },
  })

  // Contractor user
  const contractorUser = await prisma.user.upsert({
    where: { email: 'peter@hansenbyg.dk' },
    update: {},
    create: {
      email: 'peter@hansenbyg.dk',
      fullName: 'Peter Hansen',
      role: 'CONTRACTOR_USER',
      passwordHash,
      twoFactorEnabled: true,
      twoFactorMethod: 'TOTP',
      twoFactorSecret: totpSecret,
      phone: '+45 40 12 34 56',
    },
  })

  await prisma.contractorUser.upsert({
    where: { userId: contractorUser.id },
    update: {},
    create: {
      userId: contractorUser.id,
      contractorId: contractor.id,
    },
  })

  // Demo project
  await prisma.project.upsert({
    where: { claimId: 'CLM-2024-001' },
    update: {},
    create: {
      claimId: 'CLM-2024-001',
      insurerCaseId: 'TRYG-2024-98765',
      insurancePolicyNumber: 'POL-123456',
      insuranceCompanyId: insurer.id,
      damageType: 'Vandskade',
      damageDescription: 'Rørbrud i køkken med omfattende vandskade',
      priorityLevel: 'HIGH',
      buildingType: 'Enfamiliehus',
      address: 'Eksempelvej 12',
      postalCode: '2100',
      city: 'København Ø',
      region: 'Sjælland',
      maxApprovedPrice: 250000,
      contactName: 'Lars Andersen',
      contactPhone: '+45 31 23 45 67',
      contactEmail: 'lars@example.dk',
      currentMilestone: 'BIDDING_IN_PROGRESS',
      progressPercent: 25,
      entreprises: {
        create: [
          { type: 'PLUMBER', description: 'Udskiftning af brudt rør', isRelevant: true, currentMilestone: 'NOT_STARTED' },
          { type: 'CARPENTER', description: 'Reparation af vandbeskadiget gulv', isRelevant: true, currentMilestone: 'NOT_STARTED' },
          { type: 'PAINTER', description: 'Ommaling af berørt område', isRelevant: true, currentMilestone: 'NOT_STARTED' },
        ],
      },
    },
  })

  console.log('✅ Seed completed')
  console.log('  admin@sedgwick.dk / Sedgwick2024!')
  console.log('  case@tryg.dk / Sedgwick2024!')
  console.log('  peter@hansenbyg.dk / Sedgwick2024!')
  console.log('  (TOTP secret stored encrypted — use Authenticator app)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
