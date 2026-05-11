import { prisma } from './db';

interface SystemMessageOptions {
    subject: string;
    content: string;
    category?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    senderId?: string;
    recipientUserId?: string;
    recipientRoleId?: string;
    recipientRoleIds?: string[];
    deadline?: Date;
    customerName?: string | null;
    deliveryOrderNumber?: string | null;
    invoiceNumber?: string | null;
    partnerName?: string | null;
}

/**
 * Sends a system-generated message to a user or a role.
 * Automatically creates MessageReceipts for all active users in a role if recipientRoleId is provided.
 */
export async function sendSystemMessage(options: SystemMessageOptions) {
    const {
        subject,
        content,
        category = 'SYSTEM',
        priority = 'MEDIUM',
        senderId,
        recipientUserId,
        recipientRoleId,
        recipientRoleIds,
        deadline,
        customerName,
        deliveryOrderNumber,
        invoiceNumber,
        partnerName
    } = options;

    // Use a default system user if senderId is not provided
    // Finding an admin or system user would be ideal, but for now we'll require callers 
    // to provide a user ID or we'll look up the first ADMIN user as a fallback.
    let finalSenderId = senderId;
    if (!finalSenderId) {
        const systemUser = await prisma.user.findFirst({
            where: { role: { name: 'ADMIN' } },
            select: { id: true }
        });
        finalSenderId = systemUser?.id;
    }

    if (!finalSenderId) {
        throw new Error('No sender ID provided and no system admin found');
    }

    const message = await prisma.message.create({
        data: {
            subject,
            content,
            category,
            priority,
            deadline,
            isSystemGenerated: true,
            senderId: finalSenderId,
            recipientUserId: recipientUserId || null,
            recipientRoleId: recipientRoleId || (recipientRoleIds && recipientRoleIds.length > 0 ? recipientRoleIds[0] : null),
            customerName: customerName || null,
            deliveryOrderNumber: deliveryOrderNumber || null,
            invoiceNumber: invoiceNumber || null,
            partnerName: partnerName || null
        }
    });

    // Create receipts for individual recipient
    if (recipientUserId) {
        await prisma.messageReceipt.create({
            data: {
                messageId: message.id,
                userId: recipientUserId
            }
        });
    }

    // Create receipts for all users in recipient roles
    const allRoleIds = [recipientRoleId, ...(recipientRoleIds || [])].filter(Boolean) as string[];
    
    if (allRoleIds.length > 0) {
        const usersInRoles = await prisma.user.findMany({
            where: { roleId: { in: allRoleIds }, isActive: true },
            select: { id: true }
        });

        if (usersInRoles.length > 0) {
            // Deduplicate users just in case
            const uniqueUserIds = Array.from(new Set(usersInRoles.map(u => u.id)));
            
            await prisma.messageReceipt.createMany({
                data: uniqueUserIds.map(userId => ({
                    messageId: message.id,
                    userId
                }))
            });
        }
    }

    return message;
}
