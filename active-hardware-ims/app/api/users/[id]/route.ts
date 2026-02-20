import { NextResponse } from 'next/server'
import { requirePermission, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logUpdate, logDelete } from '@/lib/audit'
import { use } from 'react'

// GET - Get user details (ADMIN only)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // Only require 'users:read' for fetching the user details
        await requirePermission('users:read')

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                salesRepId: true,
                salesRep: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ user })
    } catch (error: any) {
        console.error('Get user error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch user' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}

// PATCH - Update user (ADMIN only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const currentUser = await requirePermission('users:update')
        const { name, email, roleId, isActive, password, salesRepId } = await request.json()

        // Get current user data
        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { role: true }
        })

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Prevent admin from changing their own role maliciously
        if (id === currentUser.id && roleId && roleId !== existingUser.roleId) {
            return NextResponse.json(
                { error: 'Cannot change your own role' },
                { status: 400 }
            )
        }

        // Check for duplicate email if changing
        if (email && email !== existingUser.email) {
            const duplicate = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            })
            if (duplicate) {
                return NextResponse.json(
                    { error: 'User with this email already exists' },
                    { status: 400 }
                )
            }
        }

        // Build update data
        const updateData: any = {}
        if (name) updateData.name = name
        if (email) updateData.email = email.toLowerCase()
        if (roleId) updateData.roleId = roleId
        if (typeof isActive === 'boolean') updateData.isActive = isActive
        if (password) {
            updateData.password = await hashPassword(password)
            updateData.mustChangePassword = true
        }
        if (salesRepId !== undefined) {
            updateData.salesRepId = salesRepId
        }

        // Update user
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: { select: { name: true } },
                legacyRole: true,
                isActive: true,
                updatedAt: true,
                salesRepId: true
            }
        })

        // Log update
        await logUpdate('USER', id, currentUser.id, currentUser.name, {
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role?.name || existingUser.legacyRole,
            isActive: existingUser.isActive,
            salesRepId: existingUser.salesRepId
        }, {
            name: user.name,
            email: user.email,
            role: user.role?.name || user.legacyRole,
            isActive: user.isActive,
            salesRepId: user.salesRepId
        })

        return NextResponse.json({ user })
    } catch (error: any) {
        console.error('Update user error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update user' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}

// DELETE - Deactivate user (ADMIN only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const currentUser = await requirePermission('users:delete')

        // Prevent admin from deleting themselves
        if (id === currentUser.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Soft delete - deactivate instead of deleting
        await prisma.user.update({
            where: { id },
            data: { isActive: false }
        })

        // Log deletion
        await logDelete('USER', id, currentUser.id, currentUser.name, {
            name: user.name,
            email: user.email,
            role: user.legacyRole
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        console.error('Delete user error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
