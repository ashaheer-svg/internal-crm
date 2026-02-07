import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { name, type, address } = body

        if (!name || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const location = await prisma.location.update({
            where: { id: params.id },
            data: {
                name,
                type,
                address
            }
        })

        return NextResponse.json(location)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json().catch(() => ({}))
        const { transferToLocationId } = body

        // Check if location has inventory
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { inventory: true }
                },
                inventory: true
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // If location has inventory
        if (location._count.inventory > 0) {
            // If no transfer location provided, return error
            if (!transferToLocationId) {
                return NextResponse.json(
                    {
                        error: `Cannot delete location with ${location._count.inventory} items in stock`,
                        requiresTransfer: true,
                        inventoryCount: location._count.inventory
                    },
                    { status: 400 }
                )
            }

            // Validate transfer location exists and is different
            if (transferToLocationId === params.id) {
                return NextResponse.json(
                    { error: 'Cannot transfer to the same location' },
                    { status: 400 }
                )
            }

            const targetLocation = await prisma.location.findUnique({
                where: { id: transferToLocationId }
            })

            if (!targetLocation) {
                return NextResponse.json(
                    { error: 'Target location not found' },
                    { status: 404 }
                )
            }

            // Transfer all inventory items and delete location in a transaction
            await prisma.$transaction(async (tx) => {
                // Update all inventory items to new location
                await tx.inventoryItem.updateMany({
                    where: { locationId: params.id },
                    data: { locationId: transferToLocationId }
                })

                // Create transaction logs for each transferred item
                for (const item of location.inventory) {
                    await tx.transactionLog.create({
                        data: {
                            type: 'TRANSFER',
                            referenceType: 'TRANSFER',
                            referenceId: params.id,
                            productId: item.productId,
                            serialNumber: item.serialNumber,
                            quantity: 1,
                            fromLocation: location.name,
                            toLocation: targetLocation.name,
                            performedBy: 'System',
                            notes: `Location deletion: Transferred from ${location.name} to ${targetLocation.name}`
                        }
                    })
                }

                // Delete the location
                await tx.location.delete({
                    where: { id: params.id }
                })
            })

            return NextResponse.json({
                success: true,
                message: `Location deleted and ${location._count.inventory} items transferred to ${targetLocation.name}`
            })
        }

        // No inventory, safe to delete
        await prisma.location.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Location deletion error:', error)
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
