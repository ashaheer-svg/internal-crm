import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// FORCE ABSOLUTE PATH resolution for SQLite 
// This matches the logic that worked in our debug script
const getDatabaseUrl = () => {
  const envUrl = process.env.DATABASE_URL

  // Only override if we are in production and it's a RELATIVE file url (starts with file:.)
  if (process.env.NODE_ENV === 'production' && envUrl?.startsWith('file:.') && !envUrl.startsWith('file:/')) {
    try {
      // Construct absolute path based on CWD
      // This assumes the app is run from the project root where prisma folder is
      const dbPath = path.join(process.cwd(), 'prisma', 'prod.db')
      const absoluteUrl = `file:${dbPath}`
      console.log('--- DB PATH FIX APPLIED ---')
      console.log('Original URL:', envUrl)
      console.log('CWD:', process.cwd())
      console.log('Forced Absolute URL:', absoluteUrl)
      return absoluteUrl
    } catch (e) {
      console.error('Failed to construct absolute path:', e)
      return envUrl
    }
  }
  console.log('--- USING CONFIG DB URL ---')
  console.log('URL:', envUrl)
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
