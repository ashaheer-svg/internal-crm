import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendQuoteApprovedAlert } from '@/lib/whatsapp'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await context.params
        const body = await request.json().catch(() => ({}))

        // Pre-fetch quote to verify existence and get details
        const quote = await (prisma as any).cRMQuote.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        details: true
                    }
                },
                project: {
                    include: {
                        customer: true
                    }
                },
                billTo: true,
                shipTo: true
            }
        })

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
        }


        // --- 2. Execute Transaction with Retry Logic (Self-Healing) ---
        let attempts = 0
        const MAX_ATTEMPTS = 5
        let result: any = null

        while (attempts < MAX_ATTEMPTS) {
            attempts++
            try {
                result = await prisma.$transaction(async (tx) => {
                    // A. Get and Update Sequence (Inside Transaction to prevent race conditions)
                    const now = new Date()
                    const year = now.getFullYear().toString().slice(-2)
                    const month = (now.getMonth() + 1).toString().padStart(2, '0')
                    const currentYearMonth = `${year}${month}`

                    // 1. Fetch current sequence
                    let sequence = await tx.sequence.findUnique({
                        where: { id: 'DO' }
                    })

                    if (!sequence) {
                        sequence = await tx.sequence.create({
                            data: {
                                id: 'DO',
                                prefix: 'DO-',
                                nextNumber: 1,
                                lastYearMonth: currentYearMonth
                            }
                        })
                    }

                    // 2. Determine next number and update atomically
                    let nextNum: number
                    let lastYM = sequence.lastYearMonth

                    if (lastYM !== currentYearMonth) {
                        // Month reset
                        await tx.sequence.update({
                            where: { id: 'DO' },
                            data: {
                                nextNumber: 2,
                                lastYearMonth: currentYearMonth
                            }
                        })
                        nextNum = 1
                        lastYM = currentYearMonth
                    } else {
                        // Standard increment
                        const updated = await tx.sequence.update({
                            where: { id: 'DO' },
                            data: {
                                nextNumber: { increment: 1 }
                            }
                        })
                        nextNum = updated.nextNumber - 1
                    }

                    const doNumber = `${sequence.prefix}${currentYearMonth}-${nextNum.toString().padStart(4, '0')}`

                    console.log(`[DEBUG] Attempt ${attempts}: Trying DO number ${doNumber}`)

                    // 3. Pre-check existence (Safety Double-Check)
                    const exists = await tx.deliveryOrder.findUnique({
                        where: { orderNumber: doNumber }
                    })

                    if (exists) {
                        console.log(`[DEBUG] Number ${doNumber} already exists in DB. Rolling back and incrementing sequence...`)
                        throw { code: 'P2002', message: `orderNumber collision on ${doNumber}` }
                    }

                    // B. Create Delivery Order (DRAFT)
                    const deliveryOrder = await (tx as any).deliveryOrder.create({
                        data: {
                            orderNumber: doNumber,
                            customerId: quote.billToId || quote.project.customerId,
                            customerName: (quote as any).billTo?.name || quote.project.customer?.name || 'Unknown',
                            endCustomerId: quote.saleType === 'PARTNER' ? (quote.shipToId || quote.project.customerId) : null,
                            endCustomerName: quote.saleType === 'PARTNER' ? ((quote as any).shipTo?.name || quote.project.customer?.name) : null,
                            saleType: quote.saleType || 'DIRECT',
                            invoiceValue: quote.subTotal, // Use Sub-total for revenue reporting
                            salesRepId: quote.project.salesRepId || null,
                            notes: `Converted from Quote ${quote.quoteNumber}. PO: ${body.poNumber || 'N/A'}.`,
                            buildInstructions: body.buildInstructions || null,
                            deliveryInstructions: body.deliveryInstructions || null,
                            additionalContact: body.additionalContact || null,
                            deliveryCharges: body.deliveryCharges ? Number(body.deliveryCharges) : 0,
                            quoteReference: quote.quoteNumber,
                            status: 'DRAFT',
                            items: {
                                create: quote.items
                                    .filter((item: any) => item.productId) // Only items with products go to DO
                                    .map((item: any) => ({
                                        productId: item.productId,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        isBackorder: false,
                                        details: {
                                            create: (item.details && item.details.length > 0)
                                                ? item.details.map((d: any) => ({
                                                    modelName: d.modelName,
                                                    serialNumbers: d.serialNumbers
                                                }))
                                                : (item.productModel || item.serialNumbers)
                                                    ? [{
                                                        modelName: item.productModel || 'N/A',
                                                        serialNumbers: item.serialNumbers || 'N/A'
                                                    }]
                                                    : []
                                        }
                                    }))
                            }
                        }
                    })

                    // C. Update Quote status and link DO
                    const updatedQuote = await (tx as any).cRMQuote.update({
                        where: { id },
                        data: {
                            status: 'ACCEPTED',
                            poNumber: body.poNumber || null,
                            poDocumentUrl: body.poDocumentUrl || null,
                            expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
                            urgency: body.urgency || null,
                            deliveryOrderId: deliveryOrder.id
                        },
                        include: {
                            project: {
                                include: {
                                    customer: true
                                }
                            },
                            deliveryOrder: true
                        }
                    })

                    // C2. Update Project status to WON and set expectedValue to subTotal
                    const wonStage = await (tx as any).cRMStage.findFirst({
                        where: {
                            pipelineId: updatedQuote.project.pipelineId,
                            name: { contains: 'Won' }
                        }
                    })

                    await (tx as any).cRMProject.update({
                        where: { id: updatedQuote.projectId },
                        data: {
                            status: 'WON',
                            expectedValue: quote.subTotal, // Set to tax-exclusive value for reporting
                            closedAt: new Date(),
                            ...(wonStage ? { stageId: wonStage.id } : {})
                        }
                    })

                    // D. Create Task for ACC-MGR
                    const accMgrRole = await (tx as any).role.findFirst({ where: { name: 'ACC-MGR' } })
                    if (accMgrRole) {
                        let description = `Quote ${quote.quoteNumber} has been approved and Delivery Order ${doNumber} has been created as a DRAFT.\n\n`
                        if (body.poNumber) description += `PO Number: ${body.poNumber}\n`
                        if (body.urgency) description += `Urgency: ${body.urgency}\n`
                        if (body.expectedDeliveryDate) description += `Requested Delivery: ${new Date(body.expectedDeliveryDate).toLocaleDateString()}\n`
                        description += `\nPlease review and finalize the Delivery Order.`

                        await (tx as any).projectTask.create({
                            data: {
                                projectId: quote.projectId,
                                title: `Finalize DO ${doNumber} (Quote ${quote.quoteNumber})`,
                                description,
                                priority: body.urgency === 'URGENT' ? 'URGENT' : 'HIGH',
                                status: 'TODO',
                                assignedToRoleId: accMgrRole.id,
                                attachmentUrl: `/dashboard/crm/quotes/${quote.id}/print`,
                                createdById: user.id
                            }
                        })

                        // E. Internal Message to ACC-MGR role
                        const usersInRole = await tx.user.findMany({ where: { roleId: accMgrRole.id, isActive: true } })
                        if (usersInRole.length > 0) {
                            await (tx as any).message.create({
                                data: {
                                    subject: `DO Created: ${doNumber} (Quote ${quote.quoteNumber}) Approved`,
                                    content: description,
                                    category: 'TASK',
                                    customerName: (quote as any).billTo?.name || quote.project.customer?.name || 'Unknown',
                                    deliveryOrderNumber: doNumber,
                                    priority: body.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
                                    senderId: user.id,
                                    recipientRoleId: accMgrRole.id,
                                    receipts: {
                                        createMany: {
                                            data: usersInRole.map(u => ({ userId: u.id }))
                                        }
                                    },
                                    attachments: {
                                        create: {
                                            fileName: `Quote-${quote.quoteNumber}.pdf`,
                                            filePath: `/dashboard/crm/quotes/${quote.id}/print`,
                                            fileType: 'application/pdf',
                                            fileSize: 0
                                        }
                                    }
                                }
                            })
                        }
                    }

                    return updatedQuote
                })
                break // BREAK if successful
            } catch (error: any) {
                // If unique constraint error on orderNumber, increment sequence and retry
                const isCollision = error.code === 'P2002' &&
                    (error.message?.includes('orderNumber') || error.message?.includes('collision'))

                if (isCollision) {
                    console.log(`[DEBUG] Collision detected: ${error.message}. Incrementing sequence and retrying...`)
                    await prisma.sequence.update({
                        where: { id: 'DO' },
                        data: { nextNumber: { increment: 1 } }
                    })
                    if (attempts >= MAX_ATTEMPTS) throw new Error('Maximum attempts reached for generating a unique Delivery Order number.')
                    continue
                }
                throw error // Bubble up other errors
            }
        }

        // F. WhatsApp Alert
        const customerPhone = result.project?.customer?.phone;
        if (customerPhone) {
            sendQuoteApprovedAlert(
                customerPhone,
                result.quoteNumber,
                result.project?.customer?.name || 'Customer'
            ).catch(err => console.error('Failed to send WhatsApp quote alert', err))
        }

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Failed to confirm quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to confirm quote' },
            { status: 500 }
        )
    }
}
