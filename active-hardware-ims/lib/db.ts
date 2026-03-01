import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// FORCE ABSOLUTE PATH resolution for SQLite 
// This matches the logic that worked in our debug script
const getDatabaseUrl = () => {
  const envUrl = process.env.DATABASE_URL
  const isProd = process.env.NODE_ENV === 'production'

  // Only override if we are in production and it's a RELATIVE file url (starts with file:.)
  if (isProd && envUrl?.startsWith('file:.') && !envUrl.startsWith('file:/')) {
    try {
      const dbPath = path.resolve(process.cwd(), 'prisma', 'prod.db')
      const absoluteUrl = `file:${dbPath}`
      console.log('--- [DB] PRODUCTION FORCED ABSOLUTE URL ---')
      console.log('Original:', envUrl)
      console.log('Resolved:', absoluteUrl)
      return absoluteUrl
    } catch (e) {
      console.error('Failed to construct absolute path:', e)
      return envUrl
    }
  }

  // LOG ABSOLUTE PATH EVEN IN DEV
  if (envUrl?.startsWith('file:')) {
    const relPath = envUrl.replace('file:', '')
    const absPath = path.resolve(process.cwd(), 'prisma', relPath.replace(/^\.\//, ''))
    console.log(`--- [DB] ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} CONFIG URL ---`)
    console.log('Original:', envUrl)
    console.log('Resolved Absolute:', absPath)
  } else {
    console.log('--- [DB] NON-FILE URL DETECTED ---')
    console.log('URL:', envUrl)
  }

  return envUrl
}

const dbUrl = getDatabaseUrl()

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
