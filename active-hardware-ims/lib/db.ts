import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log the database URL being used (redact password if present)
const dbUrl = process.env.DATABASE_URL
console.log('--- DB INIT ---')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL defined:', !!dbUrl)
if (dbUrl) {
  console.log('DATABASE_URL type:', dbUrl.startsWith('file:') ? 'SQLite' : 'Other')
  console.log('DATABASE_URL path:', dbUrl.replace('file:', ''))
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
