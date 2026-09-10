import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const jwt = require('C:/Sedgwick/node_modules/jsonwebtoken')
const { PrismaClient } = require('C:/Sedgwick/node_modules/@prisma/client')

const prisma = new PrismaClient({
  datasources: { db: { url: 'sqlserver://localhost:55164;database=sedgwick;integratedSecurity=true;trustServerCertificate=true' } }
})

const role = process.argv[2] ?? 'CONTRACTOR_USER'
const secret = 'dev-secret-change-in-production'

const u = await prisma.user.findFirst({
  where: { role },
  include: { contractorUser: true, insurerUser: true }
})
await prisma.$disconnect()

if (!u) { console.error('No user found for role:', role); process.exit(1) }

const linkedEntityId = u.contractorUser?.contractorId ?? u.insurerUser?.insuranceCompanyId ?? null
const at = jwt.sign({ sub: u.id, email: u.email, role: u.role, linkedEntityId }, secret, { expiresIn: '365d' })
const rt = jwt.sign({ sub: u.id, type: 'refresh' }, secret, { expiresIn: '365d' })

const state = {
  state: {
    accessToken: at,
    refreshToken: rt,
    user: { id: u.id, email: u.email, fullName: u.fullName, role: u.role, twoFactorEnabled: u.twoFactorEnabled, twoFactorMethod: u.twoFactorMethod },
    isAuthenticated: true
  },
  version: 0
}
console.log(JSON.stringify(state))
