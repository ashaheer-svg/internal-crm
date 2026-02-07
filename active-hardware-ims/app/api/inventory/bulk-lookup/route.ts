import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { serialNumbers, excludedItemIds = [] } = body

        if (!serialNumbers || !Array.isArray(serialNumbers)) {
            return NextResponse.json({ error: "Serial numbers array is required" }, { status: 400 })
        }

        // Lookup all serial numbers
        const items = await prisma.inventoryItem.findMany({
            where: {
                serialNumber: { in: serialNumbers },
                status: "AVAILABLE"
            },
            include: {
                product: true,
                location: true
            }
        })

        // Categorize results
        const foundMap = new Map(items.map(item => [item.serialNumber, item]))
        const found = items.filter(item => !excludedItemIds.includes(item.id))
        const alreadySelected = items
            .filter(item => excludedItemIds.includes(item.id))
            .map(item => item.serialNumber)
        const notFound = serialNumbers.filter(sn => !foundMap.has(sn))

        return NextResponse.json({
            found,
            notFound,
            alreadySelected,
            total: serialNumbers.length
        })
    } catch (error) {
        console.error("Bulk lookup error:", error)
        return NextResponse.json({ error: "Failed to lookup serial numbers" }, { status: 500 })
    }
}
