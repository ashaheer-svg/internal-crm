const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Testing search query...")
  const query = "test"
  const type = "CUSTOMER"

  const where = {
    OR: [
      { name: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } }
    ],
    isActive: true
  }

  if (type && type !== 'ALL') {
    if (type === 'CUSTOMER') where.isCustomer = true
    else if (type === 'SUPPLIER') where.isSupplier = true
    else if (type === 'PARTNER') where.isPartner = true
  }

  console.log("Where clause:", JSON.stringify(where, null, 2))

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 20
  })

  console.log("Found customers:", customers.length)
  if (customers.length > 0) {
      console.log("First match:", customers[0].name)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
