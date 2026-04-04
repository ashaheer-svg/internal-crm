// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')
async function check(dbPath) {
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:' + dbPath,
        },
      },
    })
    const count = await prisma.user.count()
    console.log(`${dbPath} : ${count}`)
    await prisma.$disconnect()
  } catch (err) {
    console.log(`${dbPath} : Error (${err.message})`)
  }
}

async function run() {
  await check('./prisma/dev.db')
  await check('./prisma/prod.db')
  await check('./prisma/prod - Copy.db')
  await check('./prisma/prisma/dev.db')
  await check('./prisma/prisma/prod.db')
  await check('./prisma/prisma/prisma/prod.db')
}

run()
