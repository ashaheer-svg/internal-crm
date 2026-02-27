import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const categories = await prisma.category.findMany();
        console.log(`Categories (${categories.length}):`);
        categories.forEach(c => {
            console.log(`- ${c.name}`);
        });

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
