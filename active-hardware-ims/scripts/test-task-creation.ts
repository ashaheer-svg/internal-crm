import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- CRM TASK CREATION TEST ---')
    try {
        // Find an existing project
        const project = await (prisma as any).cRMProject.findFirst()
        if (!project) {
            console.log('No projects found to test with')
            return
        }
        console.log('Using project:', project.id)

        // Find a user for createdBy
        const user = await prisma.user.findFirst()
        if (!user) {
            console.log('No users found to test with')
            return
        }

        const task = await (prisma as any).projectTask.create({
            data: {
                projectId: project.id,
                title: 'Test Diagnostic Task',
                description: 'Testing task creation',
                priority: 'MEDIUM',
                status: 'TODO',
                createdById: user.id
            }
        })
        console.log('Task created successfully:', task.id)
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
