import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const p = prisma as any

    // Seed the projects:view_all special permission
    const perm = await p.permission.upsert({
        where: { action_resource: { action: 'view_all', resource: 'projects' } },
        update: {},
        create: {
            action: 'view_all',
            resource: 'projects',
            description: 'Can see all CRM projects (not just own)'
        }
    })
    console.log(`Ensured permission: ${perm.action}:${perm.resource} (id: ${perm.id})`)
    console.log('Done! Grant this permission in the Roles & Permissions matrix to enable the "All Projects" toggle.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
