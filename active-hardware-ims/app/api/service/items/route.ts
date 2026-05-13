import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const items = await prisma.deliveryOrderItem.findMany({
            where: {
                product: {
                    category: {
                        in: ["License", "Rental", "AMC", "Services"]
                    }
                }
            },
            include: {
                product: true,
                deliveryOrder: {
                    include: {
                        customer: true,
                        endCustomer: true
                    }
                }
            },
            orderBy: {
                serviceEndDate: 'asc'
            }
        });

        return NextResponse.json({ items });
    } catch (error: any) {
        console.error("Error fetching service items:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
