const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Database Integrity Cleanup ---')

  // 1. Fix MessageReceipt orphans
  console.log('Checking for MessageReceipts with non-existent users...')
  const orphanedReceipts = await prisma.$executeRawUnsafe(`
    DELETE FROM MessageReceipt 
    WHERE userId NOT IN (SELECT id FROM User);
  `)
  console.log(`Deleted ${orphanedReceipts} orphaned MessageReceipt rows.`)

  // 2. Fix Message sender orphans
  // If a message sender is deleted, Prisma crashes because 'sender' is required
  console.log('Checking for Messages with non-existent senders...')
  const orphanedMessages = await prisma.$executeRawUnsafe(`
    DELETE FROM Message 
    WHERE senderId NOT IN (SELECT id FROM User);
  `)
  console.log(`Deleted ${orphanedMessages} orphaned Message rows.`)

  console.log('Cleanup complete.')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
