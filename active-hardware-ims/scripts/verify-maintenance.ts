import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- VERIFICATION: MAINTENANCE MODE & SETTINGS ---')

    try {
        // 1. Check Maintenance Mode Initial State
        const maintInit = await (prisma as any).systemSetting.findUnique({
            where: { key: 'MAINTENANCE_MODE' }
        })
        console.log('Initial Maintenance Mode:', maintInit?.value || 'false')

        // 2. Toggle Maintenance Mode ON
        await (prisma as any).systemSetting.upsert({
            where: { key: 'MAINTENANCE_MODE' },
            update: { value: 'true' },
            create: { key: 'MAINTENANCE_MODE', value: 'true' }
        })
        console.log('Toggled Maintenance Mode: ON')

        // 3. Verify Toggle
        const maintOn = await (prisma as any).systemSetting.findUnique({
            where: { key: 'MAINTENANCE_MODE' }
        })
        if (maintOn?.value === 'true') {
            console.log('✅ Maintenance Mode Successfully Enabled')
        } else {
            console.log('❌ Failed to enable Maintenance Mode')
        }

        // 4. Toggle Maintenance Mode OFF
        await (prisma as any).systemSetting.upsert({
            where: { key: 'MAINTENANCE_MODE' },
            update: { value: 'false' },
            create: { key: 'MAINTENANCE_MODE', value: 'false' }
        })
        console.log('Toggled Maintenance Mode: OFF')

        // 5. Verify Toggle
        const maintOff = await (prisma as any).systemSetting.findUnique({
            where: { key: 'MAINTENANCE_MODE' }
        })
        if (maintOff?.value === 'false') {
            console.log('✅ Maintenance Mode Successfully Disabled')
        } else {
            console.log('❌ Failed to disable Maintenance Mode')
        }

        // 6. Check Email Config Placeholder
        const emailConfig = await (prisma as any).systemSetting.findMany({
            where: { key: { startsWith: 'SMTP_' } }
        })
        console.log('Email Settings Count:', emailConfig.length)

    } catch (error) {
        console.error('Verification failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
