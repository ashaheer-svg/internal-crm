import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- CRM TASK CREATION DEBUG SESSION ---')
    try {
        const user = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } }, include: { role: true } })
        if (!user) {
            console.log('No admin user found')
            return
        }
        console.log('Using user:', user.name, 'with role:', user.role.name)

        // Ensure we have a customer
        let customer = await (prisma as any).customer.findFirst()
        if (!customer) {
            console.log('Creating test customer...')
            customer = await (prisma as any).customer.create({
                data: {
                    name: 'Test Customer'
                }
            })
        }

        // Ensure we have a pipeline and stage
        let pipeline = await (prisma as any).cRMPipeline.findFirst()
        if (!pipeline) {
            console.log('Creating test pipeline...')
            pipeline = await (prisma as any).cRMPipeline.create({
                data: { name: 'Test Pipeline' }
            })
        }
        let stage = await (prisma as any).cRMStage.findFirst({ where: { pipelineId: pipeline.id } })
        if (!stage) {
            console.log('Creating test stage...')
            stage = await (prisma as any).cRMStage.create({
                data: { name: 'Test Stage', pipelineId: pipeline.id, order: 1 }
            })
        }

        console.log('Creating test project...')
        const project = await (prisma as any).cRMProject.create({
            data: {
                title: 'Debug Project',
                projectCode: 'DEB-' + Date.now(),
                status: 'OPEN',
                customerId: customer.id,
                pipelineId: pipeline.id,
                stageId: stage.id
            }
        })
        console.log('Project created:', project.id)

        console.log('Attempting task creation (Role-based)...')
        // Try creating with a role assignment
        const task = await (prisma as any).projectTask.create({
            data: {
                projectId: project.id,
                title: 'Assigned to Role Task',
                priority: 'HIGH',
                status: 'TODO',
                assignedToRoleId: user.roleId,
                createdById: user.id
            },
            include: {
                project: { select: { title: true } }
            }
        })
        console.log('Task created with role:', task.id)

        console.log('Attempting message notification for role...')
        const usersInRole = await prisma.user.findMany({
            where: { roleId: user.roleId, isActive: true },
            select: { id: true }
        })
        const msg = await (prisma as any).message.create({
            data: {
                subject: `New CRM Task for Category: ${task.title}`,
                content: `Test content for project "${task.project.title}"`,
                category: 'TASK',
                priority: 'HIGH',
                senderId: user.id,
                recipientRoleId: user.roleId,
                receipts: {
                    createMany: {
                        data: usersInRole.map(u => ({ userId: u.id }))
                    }
                }
            }
        })
        console.log('Notification message created:', msg.id)

    } catch (err: any) {
        console.error('FAILURE:', err.message)
        console.error('Stack:', err.stack)
    } finally {
        await prisma.$disconnect()
    }
}

main()
