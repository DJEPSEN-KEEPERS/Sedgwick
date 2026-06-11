import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const jwt = require('C:/Sedgwick/node_modules/jsonwebtoken')
const { PrismaClient } = require('C:/Sedgwick/node_modules/@prisma/client')

const prisma = new PrismaClient({
  datasources: { db: { url: 'sqlserver://localhost:55164;database=sedgwick;integratedSecurity=true;trustServerCertificate=true' } }
})

const u = await prisma.user.findFirst({
  where: { role: 'SEDGWICK_ADMIN' },
  select: { id: true, email: true, fullName: true, role: true }
})
await prisma.$disconnect()

const secret = 'dev-secret-change-in-production'
const at = jwt.sign({ sub: u.id, email: u.email, role: u.role, linkedEntityId: null }, secret, { expiresIn: '365d' })
const rt = jwt.sign({ sub: u.id, type: 'refresh' }, secret, { expiresIn: '365d' })
const state = { state: { accessToken: at, refreshToken: rt, user: { id: u.id, email: u.email, fullName: u.fullName, role: u.role }, isAuthenticated: true }, version: 0 }
console.log('TOKEN:' + at)
console.log('STATE:' + JSON.stringify(state))
