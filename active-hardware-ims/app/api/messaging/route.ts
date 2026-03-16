import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { logCreate } from '@/lib/audit'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip', '.txt']

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'messaging')

export async function POST(req: Request) {
    try {
        const user: any = await requireAuth()
        const formData = await req.formData()

        const subject = formData.get('subject') as string
        const content = formData.get('content') as string
        const category = (formData.get('category') as string) || 'GENERAL'
        const priority = (formData.get('priority') as string) || 'MEDIUM'
        const deadlineStr = formData.get('deadline') as string
        const recipientUserId = formData.get('recipientUserId') as string
        const recipientRoleId = formData.get('recipientRoleId') as string

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
        }

        // Verify Recipient Existence
        if (recipientUserId) {
            const recipient = await prisma.user.findUnique({ where: { id: recipientUserId } })
            if (!recipient) return NextResponse.json({ error: 'Recipient user not found' }, { status: 400 })
        } else if (recipientRoleId) {
            const role = await prisma.role.findUnique({ where: { id: recipientRoleId } })
            if (!role) return NextResponse.json({ error: 'Recipient role not found' }, { status: 400 })
        } else {
            return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
        }

        const deadline = (deadlineStr && deadlineStr.trim()) ? new Date(deadlineStr) : null

        // Create the message
        const message = await prisma.message.create({
            data: {
                subject,
                content,
                category,
                priority,
                deadline,
                senderId: user.id,
                recipientUserId: recipientUserId || null,
                recipientRoleId: recipientRoleId || null
            }
        })

        // Handle Attachments
        const files = formData.getAll('files') as File[]
        for (const file of files) {
            if (!file.name || file.size === 0) continue

            if (file.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: `File ${file.name} exceeds 10MB limit` }, { status: 400 })
            }

            const ext = extname(file.name).toLowerCase()
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                return NextResponse.json({ error: `File type ${ext} is not allowed` }, { status: 400 })
            }

            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Ensure upload dir exists
            await mkdir(UPLOAD_DIR, { recursive: true })

            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const filePath = join(UPLOAD_DIR, fileName)
            const publicPath = `/uploads/messaging/${fileName}`

            await writeFile(filePath, buffer)

            await prisma.messageAttachment.create({
                data: {
                    messageId: message.id,
                    fileName: file.name,
                    filePath: publicPath,
                    fileType: file.type,
                    fileSize: file.size
                }
            })
        }

        // Create receipts for individual recipient
        if (recipientUserId) {
            await prisma.messageReceipt.create({
                data: {
                    messageId: message.id,
                    userId: recipientUserId
                }
            })
        }

        // Create receipts for all users in recipient role
        if (recipientRoleId) {
            const usersInRole = await prisma.user.findMany({
                where: { roleId: recipientRoleId, isActive: true },
                select: { id: true }
            })

            if (usersInRole.length > 0) {
                await prisma.messageReceipt.createMany({
                    data: usersInRole.map(u => ({
                        messageId: message.id,
                        userId: u.id
                    }))
                })
            }
        }

        // Audit Log
        await logCreate('MESSAGE', message.id, user.id, user.name, {
            subject: message.subject,
            category: message.category,
            recipientUserId,
            recipientRoleId
        })

        return NextResponse.json({ message })
    } catch (error: any) {
        console.error('Create message error:', error)
        return NextResponse.json({ error: error.message || 'Failed to create message' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const user: any = await requireAuth()
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'inbox' // inbox, sent, admin
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'
        const category = searchParams.get('category')

        const where: any = {}

        if (type === 'sent') {
            where.senderId = user.id
        } else if (type === 'inbox') {
            where.OR = [
                { recipientUserId: user.id },
                {
                    AND: [
                        { recipientRoleId: user.roleId },
                        { recipientRoleId: { not: null } }
                    ]
                }
            ]
        } else if (type === 'admin') {
            if (!user.permissions.includes('all:manage')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        if (category && category !== 'ALL') {
            where.category = category
        }

        if (search) {
            where.OR = [
                ...(where.OR || []),
                { subject: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { sender: { name: { contains: search, mode: 'insensitive' } } },
            ]
        }

        const orderBy: any = {}
        orderBy[sortKey === 'date' ? 'createdAt' : sortKey] = sortDir

        const include = {
            sender: { select: { name: true, email: true } },
            recipientUser: { select: { name: true, email: true } },
            recipientRole: true,
            attachments: true,
            receipts: {
                include: { user: { select: { name: true } } }
            }
        }

        if (page && limit) {
            const skip = (page - 1) * limit
            
            // Build where for unread
            const unreadWhere = {
                ...where,
                receipts: {
                    some: type === 'admin' ? { viewedAt: null } : { userId: user.id, viewedAt: null }
                }
            }

            const [messages, total, unreadCount, urgentCount, taskCount] = await Promise.all([
                prisma.message.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include
                }),
                prisma.message.count({ where }),
                prisma.message.count({ where: unreadWhere }),
                prisma.message.count({ where: { ...where, priority: 'URGENT' } }),
                prisma.message.count({ where: { ...where, category: 'TASK' } })
            ])

            return NextResponse.json({
                messages,
                stats: { unreadCount, urgentCount, taskCount },
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        const messages = await prisma.message.findMany({
            where,
            orderBy,
            include
        })

        // For non-paginated (all)
        const unreadWhereAll = { ...where, receipts: { some: type === 'admin' ? { viewedAt: null } : { userId: user.id, viewedAt: null } } }
        const stats = {
            unreadCount: await prisma.message.count({ where: unreadWhereAll }),
            urgentCount: await prisma.message.count({ where: { ...where, priority: 'URGENT' } }),
            pathCount: await prisma.message.count({ where: { ...where, category: 'TASK' } }) // match key name below
        }

        return NextResponse.json({ 
            messages, 
            stats: {
                unreadCount: stats.unreadCount, 
                urgentCount: stats.urgentCount, 
                taskCount: await prisma.message.count({ where: { ...where, category: 'TASK' } })
            } 
        })
    } catch (error: any) {
        console.error('List messages error:', error)
        return NextResponse.json({ error: error.message || 'Failed to list messages' }, { status: 500 })
    }
}
