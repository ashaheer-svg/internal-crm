'use server'

import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function logoutAllUsers() {
    // Ensure only admins can perform this action
    await requireRole(['ADMIN'])

    // Delete all sessions from the database
    await prisma.session.deleteMany({})

    // Revalidate the entire application to ensure middleware/auth checks act immediately
    revalidatePath('/')
}
