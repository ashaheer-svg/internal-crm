import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await requirePermission('grn_lookup:read')
        const { searchParams } = new URL(request.url)
        const grnNumber = searchParams.get("grnNumber")

        if (grnNumber) {
            // Fetch specific GRN with details
            const grn = await prisma.goodsReceiptNote.findUnique({
                where: { grnNumber },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            if (!grn) {
                return NextResponse.json({ error: "GRN not found" }, { status: 404 })
            }

            return NextResponse.json(grn)
        } else {
            // Fetch all GRNs for the list
            const grns = await prisma.goodsReceiptNote.findMany({
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    grnNumber: true,
                    supplier: true,
                    createdAt: true,
                    status: true
                }
            })
            return NextResponse.json(grns)
        }
    } catch (error: any) {
        console.error("Failed to lookup GRN:", error)
        return NextResponse.json({ error: error.message || "Failed to lookup GRN" }, { status: 500 })
    }
}
