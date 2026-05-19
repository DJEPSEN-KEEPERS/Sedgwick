/**
 * seedDemo.ts
 * Creates 3 contractors with user accounts and 2–3 projects each.
 * Safe to re-run (uses upsert on unique fields).
 *
 * Run: npx ts-node prisma/seedDemo.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400000)
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Running demo seed...\n')

  // Shared password for all demo contractor accounts — change after demo!
  const sharedHash = await bcrypt.hash('Sedgwick2024!', 12)

  // ── 1. Ensure InsuranceCompany exists ────────────────────────────────────────
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
  console.log(`✔  InsuranceCompany: ${insurer.name}`)

  // ── 2. Find Sedgwick admin (needed as invitedByUserId for BidInvitations) ────
  let admin = await prisma.user.findFirst({ where: { role: 'SEDGWICK_ADMIN' } })
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@sedgwick.dk',
        fullName: 'Sedgwick Admin',
        role: 'SEDGWICK_ADMIN',
        passwordHash: sharedHash,
        twoFactorEnabled: false,
      },
    })
  }
  console.log(`✔  Admin user: ${admin.email}`)

  // ── 3. Contractors ────────────────────────────────────────────────────────────

  const contractorDefs = [
    {
      cvr: '12345678',
      companyName: 'Hansen Tømrer & Byg A/S',
      contactName: 'Peter Hansen',
      contactEmail: 'peter@hansenbyg.dk',
      contactPhone: '+45 40 12 34 56',
      description: 'Specialiseret i vandskader og genopbygning af træstrukturer',
      rating: 4.7,
      region: 'Sjælland',
      userEmail: 'peter@hansenbyg.dk',
      userFullName: 'Peter Hansen',
      userPassword: sharedHash,
    },
    {
      cvr: '87654321',
      companyName: 'Nielsen Murerfirma ApS',
      contactName: 'Morten Nielsen',
      contactEmail: 'morten@nielsenmurerdk',
      contactPhone: '+45 22 56 78 90',
      description: 'Murerfirma med speciale i fugt- og brandskader',
      rating: 4.4,
      region: 'Midtjylland',
      userEmail: 'morten@nielsenmurer.dk',
      userFullName: 'Morten Nielsen',
      userPassword: sharedHash,
    },
    {
      cvr: '33445566',
      companyName: 'Madsen El & VVS A/S',
      contactName: 'Susanne Madsen',
      contactEmail: 'susanne@madsenel.dk',
      contactPhone: '+45 51 98 76 54',
      description: 'El- og VVS-entrepriser, vandskader og rørbrud',
      rating: 4.9,
      region: 'Nordjylland',
      userEmail: 'susanne@madsenel.dk',
      userFullName: 'Susanne Madsen',
      userPassword: sharedHash,
    },
  ]

  const contractors: { id: string; companyName: string; userId: string }[] = []

  for (const def of contractorDefs) {
    // Contractor record
    const c = await prisma.contractor.upsert({
      where: { cvrNumber: def.cvr },
      update: {},
      create: {
        companyName: def.companyName,
        cvrNumber: def.cvr,
        contactName: def.contactName,
        contactEmail: def.contactEmail,
        contactPhone: def.contactPhone,
        description: def.description,
        maxParallelProjects: 8,
        currentWorkload: 3,
        sedgwickRatingAvg: def.rating,
        clientRatingAvg: def.rating - 0.2,
        regions: { create: [{ regionName: def.region }] },
      },
    })

    // User account (twoFactorEnabled: false = no TOTP at login)
    const u = await prisma.user.upsert({
      where: { email: def.userEmail },
      update: {},
      create: {
        email: def.userEmail,
        fullName: def.userFullName,
        role: 'CONTRACTOR_USER',
        passwordHash: def.userPassword,
        twoFactorEnabled: false,
        phone: def.contactPhone,
      },
    })

    // Link
    await prisma.contractorUser.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, contractorId: c.id },
    })

    contractors.push({ id: c.id, companyName: c.companyName, userId: u.id })
    console.log(`✔  Contractor: ${c.companyName}  /  user: ${u.email}`)
  }

  // ── 4. Projects ───────────────────────────────────────────────────────────────
  // Layout:
  //   Hansen   → 3 projects (1 with past deadline = SLA breach, 1 bidding)
  //   Nielsen  → 3 projects (1 with past deadline = SLA breach, 1 bidding)
  //   Madsen   → 2 projects (1 with past deadline = SLA breach)
  //
  // Total: 8 ACTIVE, 3 SLA-breached, 4 BidInvitations (PENDING)

  const [hansen, nielsen, madsen] = contractors

  interface ProjectDef {
    claimId: string
    insurerCaseId: string
    insurancePolicyNumber: string
    damageType: string
    damageDescription: string
    priorityLevel: string
    buildingType: string
    address: string
    postalCode: string
    city: string
    region: string
    contactName: string
    contactPhone: string
    contactEmail: string
    currentMilestone: string
    progressPercent: number
    selectedContractorId: string | null
    requestedDeadline?: Date
    requestedStartDate?: Date
    maxApprovedPrice: number
    entrepriseTypes: string[]
    createBidInvitation?: boolean // whether to create a PENDING bid invitation
  }

  const projectDefs: ProjectDef[] = [
    // ── Hansen (3 projects) ────────────────────────────────────────────────
    {
      claimId: 'CLM-2025-001',
      insurerCaseId: 'TRYG-2025-10001',
      insurancePolicyNumber: 'POL-100001',
      damageType: 'Vandskade',
      damageDescription: 'Rørbrud i køkken — gulv og vægge skadet',
      priorityLevel: 'HIGH',
      buildingType: 'Enfamiliehus',
      address: 'Rosenørns Allé 22',
      postalCode: '1970',
      city: 'Frederiksberg C',
      region: 'Sjælland',
      contactName: 'Karen Holm',
      contactPhone: '+45 31 22 33 44',
      contactEmail: 'karen.holm@example.dk',
      currentMilestone: 'WORK_IN_PROGRESS',
      progressPercent: 55,
      selectedContractorId: hansen.id,
      requestedDeadline: daysFromNow(14),
      maxApprovedPrice: 180000,
      entrepriseTypes: ['PLUMBER', 'CARPENTER'],
    },
    {
      claimId: 'CLM-2025-002',
      insurerCaseId: 'TRYG-2025-10002',
      insurancePolicyNumber: 'POL-100002',
      damageType: 'Stormskade',
      damageDescription: 'Tagskade efter kraftig storm — tagudhæng og isolering',
      priorityLevel: 'NORMAL',
      buildingType: 'Rækkehus',
      address: 'Skovvej 7',
      postalCode: '4600',
      city: 'Køge',
      region: 'Sjælland',
      contactName: 'Thomas Bjerg',
      contactPhone: '+45 42 11 55 66',
      contactEmail: 'thomas.bjerg@example.dk',
      currentMilestone: 'BIDDING_IN_PROGRESS',
      progressPercent: 10,
      selectedContractorId: null,
      requestedDeadline: daysFromNow(30),
      maxApprovedPrice: 95000,
      entrepriseTypes: ['ROOFER', 'CARPENTER'],
      createBidInvitation: true,
    },
    {
      // SLA breach: deadline was 5 days ago
      claimId: 'CLM-2025-003',
      insurerCaseId: 'TRYG-2025-10003',
      insurancePolicyNumber: 'POL-100003',
      damageType: 'Brandskade',
      damageDescription: 'Lettere brandskade i bryggers — sod og røg',
      priorityLevel: 'URGENT',
      buildingType: 'Enfamiliehus',
      address: 'Æblevej 4',
      postalCode: '2860',
      city: 'Søborg',
      region: 'Sjælland',
      contactName: 'Ida Christensen',
      contactPhone: '+45 60 77 88 99',
      contactEmail: 'ida.c@example.dk',
      currentMilestone: 'CONTRACTOR_ASSIGNED',
      progressPercent: 20,
      selectedContractorId: hansen.id,
      requestedDeadline: daysAgo(5),
      requestedStartDate: daysAgo(20),
      maxApprovedPrice: 140000,
      entrepriseTypes: ['PAINTER', 'CARPENTER'],
    },

    // ── Nielsen (3 projects) ───────────────────────────────────────────────
    {
      claimId: 'CLM-2025-004',
      insurerCaseId: 'TRYG-2025-10004',
      insurancePolicyNumber: 'POL-100004',
      damageType: 'Fugtskade',
      damageDescription: 'Krybekælder med fugtskader og skimmelsvamp',
      priorityLevel: 'HIGH',
      buildingType: 'Enfamiliehus',
      address: 'Jernbanegade 18',
      postalCode: '8000',
      city: 'Aarhus C',
      region: 'Midtjylland',
      contactName: 'Henrik Vang',
      contactPhone: '+45 29 33 44 55',
      contactEmail: 'henrik.vang@example.dk',
      currentMilestone: 'WORK_IN_PROGRESS',
      progressPercent: 40,
      selectedContractorId: nielsen.id,
      requestedDeadline: daysFromNow(21),
      maxApprovedPrice: 210000,
      entrepriseTypes: ['MASON', 'PLUMBER'],
    },
    {
      claimId: 'CLM-2025-005',
      insurerCaseId: 'TRYG-2025-10005',
      insurancePolicyNumber: 'POL-100005',
      damageType: 'Indbrudsskade',
      damageDescription: 'Indbrud — knust terrassedør og beskadiget vindue',
      priorityLevel: 'NORMAL',
      buildingType: 'Lejlighed',
      address: 'Vesterbrogade 101',
      postalCode: '1620',
      city: 'København V',
      region: 'Sjælland',
      contactName: 'Astrid Lund',
      contactPhone: '+45 53 12 98 76',
      contactEmail: 'astrid.lund@example.dk',
      currentMilestone: 'BIDDING_IN_PROGRESS',
      progressPercent: 5,
      selectedContractorId: null,
      requestedDeadline: daysFromNow(45),
      maxApprovedPrice: 55000,
      entrepriseTypes: ['GLAZIER', 'CARPENTER'],
      createBidInvitation: true,
    },
    {
      // SLA breach: deadline was 3 days ago
      claimId: 'CLM-2025-006',
      insurerCaseId: 'TRYG-2025-10006',
      insurancePolicyNumber: 'POL-100006',
      damageType: 'Vandskade',
      damageDescription: 'Vaskemaskine lækket — parkettegulv og underplade skadet',
      priorityLevel: 'HIGH',
      buildingType: 'Etageejendom',
      address: 'Nørrebrogade 55',
      postalCode: '2200',
      city: 'København N',
      region: 'Sjælland',
      contactName: 'Rasmus Kirkeby',
      contactPhone: '+45 71 44 55 66',
      contactEmail: 'rasmus.k@example.dk',
      currentMilestone: 'CONTRACTOR_ASSIGNED',
      progressPercent: 15,
      selectedContractorId: nielsen.id,
      requestedDeadline: daysAgo(3),
      requestedStartDate: daysAgo(15),
      maxApprovedPrice: 120000,
      entrepriseTypes: ['CARPENTER', 'PAINTER'],
    },

    // ── Madsen (2 projects) ────────────────────────────────────────────────
    {
      claimId: 'CLM-2025-007',
      insurerCaseId: 'TRYG-2025-10007',
      insurancePolicyNumber: 'POL-100007',
      damageType: 'Elskade',
      damageDescription: 'Kortslutning i elskab — beskadiget installation og væg',
      priorityLevel: 'URGENT',
      buildingType: 'Enfamiliehus',
      address: 'Danmarksvej 9',
      postalCode: '9000',
      city: 'Aalborg',
      region: 'Nordjylland',
      contactName: 'Birgit Sørensen',
      contactPhone: '+45 40 88 77 66',
      contactEmail: 'birgit.sorensen@example.dk',
      currentMilestone: 'WORK_IN_PROGRESS',
      progressPercent: 65,
      selectedContractorId: madsen.id,
      requestedDeadline: daysFromNow(7),
      maxApprovedPrice: 85000,
      entrepriseTypes: ['ELECTRICIAN', 'PAINTER'],
    },
    {
      // SLA breach: deadline was 8 days ago
      claimId: 'CLM-2025-008',
      insurerCaseId: 'TRYG-2025-10008',
      insurancePolicyNumber: 'POL-100008',
      damageType: 'VVS-skade',
      damageDescription: 'Brud på varmerør i kælder — vand i kælder og korrosion',
      priorityLevel: 'HIGH',
      buildingType: 'Villa',
      address: 'Strandvejen 200',
      postalCode: '9400',
      city: 'Nørresundby',
      region: 'Nordjylland',
      contactName: 'Lars-Erik Dahl',
      contactPhone: '+45 22 11 33 44',
      contactEmail: 'larserik.dahl@example.dk',
      currentMilestone: 'CONTRACTOR_ASSIGNED',
      progressPercent: 10,
      selectedContractorId: madsen.id,
      requestedDeadline: daysAgo(8),
      requestedStartDate: daysAgo(25),
      maxApprovedPrice: 165000,
      entrepriseTypes: ['PLUMBER', 'MASON'],
      createBidInvitation: true,
    },
  ]

  for (const p of projectDefs) {
    const project = await prisma.project.upsert({
      where: { claimId: p.claimId },
      update: {},
      create: {
        claimId: p.claimId,
        insurerCaseId: p.insurerCaseId,
        insurancePolicyNumber: p.insurancePolicyNumber,
        insuranceCompanyId: insurer.id,
        damageType: p.damageType,
        damageDescription: p.damageDescription,
        priorityLevel: p.priorityLevel,
        buildingType: p.buildingType,
        address: p.address,
        postalCode: p.postalCode,
        city: p.city,
        region: p.region,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail,
        currentMilestone: p.currentMilestone,
        progressPercent: p.progressPercent,
        selectedContractorId: p.selectedContractorId ?? undefined,
        requestedDeadline: p.requestedDeadline,
        requestedStartDate: p.requestedStartDate,
        maxApprovedPrice: p.maxApprovedPrice,
        status: 'ACTIVE',
        createdAt: daysAgo(Math.floor(Math.random() * 20) + 3),
      },
    })

    // Entreprises
    for (const etype of p.entrepriseTypes) {
      const existing = await prisma.entreprise.findFirst({
        where: { projectId: project.id, type: etype },
      })
      if (!existing) {
        await prisma.entreprise.create({
          data: {
            projectId: project.id,
            contractorId: p.selectedContractorId ?? undefined,
            type: etype,
            isRelevant: true,
            currentMilestone: p.selectedContractorId ? 'IN_PROGRESS' : 'NOT_STARTED',
            progressPercent: p.progressPercent,
          },
        })
      }
    }

    // BidInvitation (creates "bidsAwaiting" on dashboard)
    if (p.createBidInvitation) {
      // Invite a contractor that is NOT the selected one
      const invitedContractorId = p.selectedContractorId
        ? contractors.find((c) => c.id !== p.selectedContractorId)!.id
        : contractors[0].id

      const existingInvite = await prisma.bidInvitation.findFirst({
        where: { projectId: project.id, contractorId: invitedContractorId },
      })
      if (!existingInvite) {
        await prisma.bidInvitation.create({
          data: {
            projectId: project.id,
            contractorId: invitedContractorId,
            invitedByUserId: admin.id,
            status: 'PENDING',
          },
        })
      }
    }

    const sla = p.requestedDeadline && p.requestedDeadline < new Date() ? ' ⚠️  SLA-brud' : ''
    const bid = p.createBidInvitation ? ' 📨  bid invitation' : ''
    console.log(`  ✔  ${p.claimId} — ${p.damageType} — ${p.city}${sla}${bid}`)
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────────
  const [totalActive, totalSla, totalBids] = await Promise.all([
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count({ where: { status: 'ACTIVE', requestedDeadline: { lt: new Date() } } }),
    prisma.bidInvitation.count({ where: { status: 'PENDING' } }),
  ])

  console.log('\n✅  Demo seed complete!\n')
  console.log('─── Dashboard will show ─────────────────────────────────')
  console.log(`  Aktive sager:     ${totalActive}`)
  console.log(`  SLA-brud:         ${totalSla}`)
  console.log(`  Afventer tilbud:  ${totalBids}`)
  console.log('\n─── Contractor logins (adgangskode: Sedgwick2024!) ──────')
  for (const def of contractorDefs) {
    console.log(`  ${def.userEmail}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
