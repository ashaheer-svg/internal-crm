import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { logCreate } from '@/lib/audit'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip', '.txt']
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'application/zip',
    'text/plain'
]

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

        const customerName = formData.get('customerName') as string || null
        const partnerName = formData.get('partnerName') as string || null
        const invoiceNumber = formData.get('invoiceNumber') as string || null
        const deliveryOrderNumber = formData.get('deliveryOrderNumber') as string || null

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
                recipientRoleId: recipientRoleId || null,
                customerName,
                partnerName,
                invoiceNumber,
                deliveryOrderNumber
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

            // Also validate MIME type to prevent extension spoofing
            if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
                return NextResponse.json({ error: `File MIME type ${file.type} is not permitted` }, { status: 400 })
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
        const page = searchParams.get('page') ? Math.max(1, parseInt(searchParams.get('page')!)) : null
        const limit = searchParams.get('limit') ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!))) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'
        const category = searchParams.get('category')
        const unreadFilter = searchParams.get('unread') === 'true'
        const priorityFilter = searchParams.get('priority')

        const statsWhere: any = {}
        if (type === 'sent') {
            statsWhere.senderId = user.id
        } else if (type === 'inbox') {
            // Auto-backfill: create missing receipts for role-targeted messages.
            // This fixes the case where a user belongs to a role but had no receipt
            // because they were assigned to the role AFTER the message was sent,
            // or because the role had no active users at the time of sending.
            if (user.roleId) {
                // Determine which role messages this user should see.
                // A TECH-MGR should see their own messages AND those sent to TECHNICAL.
                const targetRoleIds = [user.roleId]
                
                // If user is a Tech Manager, also pull in Technical role messages
                if (user.role?.name === 'TECH-MGR') {
                    const techRole = await prisma.role.findUnique({ where: { name: 'TECHNICAL' } })
                    if (techRole) targetRoleIds.push(techRole.id)
                }

                const missingReceipts = await prisma.message.findMany({
                    where: {
                        recipientRoleId: { in: targetRoleIds },
                        receipts: { none: { userId: user.id } }
                    },
                    select: { id: true }
                })
                if (missingReceipts.length > 0) {
                    await prisma.messageReceipt.createMany({
                        data: missingReceipts.map(m => ({ messageId: m.id, userId: user.id }))
                    })
                }
            }

            statsWhere.receipts = {
                some: { userId: user.id }
            }
        } else if (type === 'admin') {
            if (!user.permissions.includes('all:manage')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        if (category && category !== 'ALL') {
            statsWhere.category = category
        }

        if (search) {
            statsWhere.OR = [
                { subject: { contains: search } },
                { content: { contains: search } },
                { sender: { name: { contains: search } } },
            ]
        }

        // listWhere starts as statsWhere
        const listWhere: any = { ...statsWhere }

        // Apply list-only filters
        if (unreadFilter) {
            listWhere.receipts = {
                some: type === 'admin' ? { viewedAt: null } : { userId: user.id, viewedAt: null }
            }
        }

        if (priorityFilter) {
            listWhere.priority = priorityFilter
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
            
            // Build unread query for stats (always based on statsWhere)
            const statsUnreadWhere = {
                ...statsWhere,
                receipts: {
                    some: type === 'admin' ? { viewedAt: null } : { userId: user.id, viewedAt: null }
                }
            }

            const [messages, total, filteredTotal, unreadCount, urgentCount, taskCount] = await Promise.all([
                prisma.message.findMany({
                    where: listWhere,
                    orderBy,
                    skip,
                    take: limit,
                    include
                }),
                prisma.message.count({ where: statsWhere }), // Global total for this tab/search
                prisma.message.count({ where: listWhere }),  // Filtered total (for pagination)
                prisma.message.count({ where: statsUnreadWhere }),
                prisma.message.count({ where: { ...statsWhere, priority: 'URGENT' } }),
                prisma.message.count({ where: { ...statsWhere, category: 'TASK' } })
            ])

            // Resolve missing customer names from database if needed
            const enhancedMessages = await resolveCustomerNames(messages)

            return NextResponse.json({
                messages: enhancedMessages,
                stats: { unreadCount, urgentCount, taskCount, total }, // Send global total
                meta: {
                    total: filteredTotal, // Meta total should be the filtered one for pagination controls
                    page,
                    limit,
                    totalPages: Math.ceil(filteredTotal / limit)
                }
            })
        }

        const messages = await prisma.message.findMany({
            where: listWhere,
            orderBy,
            include
        })

        const enhancedMessages = await resolveCustomerNames(messages)

        // For non-paginated (all)
        const unreadWhereAll = { 
            ...statsWhere, 
            receipts: { some: type === 'admin' ? { viewedAt: null } : { userId: user.id, viewedAt: null } } 
        }

        return NextResponse.json({ 
            messages: enhancedMessages, 
            stats: {
                unreadCount: await prisma.message.count({ where: unreadWhereAll }), 
                urgentCount: await prisma.message.count({ where: { ...statsWhere, priority: 'URGENT' } }), 
                taskCount: await prisma.message.count({ where: { ...statsWhere, category: 'TASK' } }),
                total: await prisma.message.count({ where: statsWhere })
            } 
        })
    } catch (error: any) {
        console.error('List messages error:', error)
        return NextResponse.json({ error: error.message || 'Failed to list messages' }, { status: 500 })
    }
}

async function resolveCustomerNames(messages: any[]) {
    // Collect unique DO and Invoice numbers from subjects if metadata is missing
    const doNumbers = new Set<string>()
    const invNumbers = new Set<string>()

    messages.forEach(m => {
        if (!m.customerName) {
            // Try to parse from subject
            const doMatch = m.subject.match(/DO-\d+-\d+/)
            if (doMatch) doNumbers.add(doMatch[0])

            const invMatch = m.subject.match(/INV-\d+/)
            if (invMatch) invNumbers.add(invMatch[0])
        }
    })

    if (doNumbers.size === 0 && invNumbers.size === 0) return messages

    // Fetch correctly matched customer names
    const [doResults, invResults] = await Promise.all([
        doNumbers.size > 0 ? prisma.deliveryOrder.findMany({
            where: { orderNumber: { in: Array.from(doNumbers) } },
            select: { orderNumber: true, customerName: true }
        }) : [],
        invNumbers.size > 0 ? prisma.invoice.findMany({
            where: { invoiceNumber: { in: Array.from(invNumbers) } },
            select: { invoiceNumber: true, customerName: true }
        }) : []
    ])

    const nameMap = new Map<string, string>()
    doResults.forEach((r: any) => nameMap.set(r.orderNumber, r.customerName))
    invResults.forEach((r: any) => nameMap.set(r.invoiceNumber, r.customerName))

    // Apply names to messages
    return messages.map(m => {
        if (!m.customerName) {
            const doMatch = m.subject.match(/DO-\d+-\d+/)
            if (doMatch && nameMap.has(doMatch[0])) {
                return { ...m, customerName: nameMap.get(doMatch[0]) }
            }
            const invMatch = m.subject.match(/INV-\d+/)
            if (invMatch && nameMap.has(invMatch[0])) {
                return { ...m, customerName: nameMap.get(invMatch[0]) }
            }
        }
        return m
    })
}
