import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendQuoteApprovedAlert } from '@/lib/whatsapp'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await context.params
        const body = await request.json().catch(() => ({}))

        const quote = await (prisma as any).cRMQuote.update({
            where: { id },
            data: {
                status: 'ACCEPTED',
                poNumber: body.poNumber || null,
                poDocumentUrl: body.poDocumentUrl || null,
                expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
                urgency: body.urgency || null,
            },
            include: {
                project: {
                    include: {
                        customer: true
                    }
                }
            }
        })

        // WhatsApp Alert
        const customerPhone = quote.project?.customer?.phone;
        if (customerPhone) {
            sendQuoteApprovedAlert(
                customerPhone,
                quote.quoteNumber,
                quote.project?.customer?.name || 'Customer'
            ).catch(err => console.error('Failed to send WhatsApp quote alert', err))
        }

        // Create Task for ACC-MGR
        try {
            const accMgrRole = await prisma.role.findFirst({ where: { name: 'ACC-MGR' } })
            if (accMgrRole) {
                let description = `Quote ${quote.quoteNumber} has been approved.\n\n`
                if (body.poNumber) description += `PO Number: ${body.poNumber}\n`
                if (body.expectedDeliveryDate) description += `Requested Delivery: ${body.expectedDeliveryDate}\n`
                if (body.poDocumentUrl) description += `PO Document: ${body.poDocumentUrl}\n`
                description += `\nPlease process this into a Delivery Order.`

                await (prisma as any).projectTask.create({
                    data: {
                        projectId: quote.projectId,
                        title: `Process DO for Quote ${quote.quoteNumber}`,
                        description,
                        priority: body.urgency || 'HIGH',
                        status: 'TODO',
                        assignedToRoleId: accMgrRole.id,
                        createdById: user.id
                    }
                })

                // Opt: Notify ACC-MGR members here as well via internal Messaging
                const usersInRole = await prisma.user.findMany({ where: { roleId: accMgrRole.id, isActive: true } })
                if (usersInRole.length > 0) {
                    await (prisma as any).message.create({
                        data: {
                            subject: `DO Required: Quote ${quote.quoteNumber} Approved`,
                            content: description,
                            category: 'TASK',
                            priority: body.urgency || 'HIGH',
                            senderId: user.id,
                            recipientRoleId: accMgrRole.id,
                            receipts: {
                                createMany: {
                                    data: usersInRole.map(u => ({ userId: u.id }))
                                }
                            }
                        }
                    })
                }
            }
        } catch (e) {
            console.error('Failed to create ACC-MGR task for approved quote:', e)
        }

        return NextResponse.json(quote)

    } catch (error: any) {
        console.error('Failed to confirm quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to confirm quote' },
            { status: 500 }
        )
    }
}
