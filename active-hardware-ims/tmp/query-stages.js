const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const pipelines = await prisma.cRMPipeline.findMany({
            include: { stages: true }
        });
        console.log(JSON.stringify(pipelines, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
