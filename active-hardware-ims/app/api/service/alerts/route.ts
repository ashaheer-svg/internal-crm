import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/service/alerts
 * Scans for expiring/expired service items and dispatches in-app messages.
 */
export async function POST() {
    try {
        const user: any = await requireAuth();

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // 1. Fetch items to check
        const items = await prisma.deliveryOrderItem.findMany({
            where: {
                product: {
                    category: {
                        in: ["License", "Rental", "AMC", "Services"]
                    }
                },
                serviceEndDate: { not: null }
            },
            include: {
                product: true,
                deliveryOrder: {
                    include: {
                        salesRep: {
                            include: {
                                users: {
                                    where: { isActive: true },
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // 2. Fetch ACC-MGR role for broadcasting
        const accMgrRole = await prisma.role.findUnique({
            where: { name: 'ACC-MGR' }
        });

        let alertsSent = 0;

        for (const item of items) {
            const endDate = new Date(item.serviceEndDate!);
            endDate.setHours(0, 0, 0, 0);

            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let alertType: 'EXPIRING' | 'EXPIRED' | null = null;
            let priority: 'URGENT' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
            let label = "";

            if (diffDays < 0) {
                alertType = 'EXPIRED';
                priority = 'URGENT';
                label = `EXPIRED (${Math.abs(diffDays)} days ago)`;
            } else if (diffDays <= 7) {
                alertType = 'EXPIRING';
                priority = 'HIGH';
                label = `Expiring in ${diffDays} days`;
            } else if (diffDays <= 30) {
                alertType = 'EXPIRING';
                priority = 'MEDIUM';
                label = `Expiring in ${diffDays} days`;
            }

            if (!alertType) continue;

            // Check for duplicates (prevent spamming every day if not needed, 
            // but for now we follow the plan: send if not sent recently)
            // We'll send if alertSentAt is null or older than 7 days (for expiring) 
            // or 1 day (for urgent expired)
            const lastSent = alertType === 'EXPIRED' ? item.expiredAlertSentAt : item.expiryAlertSentAt;
            const cooldown = alertType === 'EXPIRED' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

            if (lastSent && (now.getTime() - new Date(lastSent).getTime() < cooldown)) {
                continue;
            }

            // Construct Message
            const subject = `⚠️ [${priority}] Service ${alertType === 'EXPIRED' ? 'Expired' : 'Expiring'} — ${item.deliveryOrder.customerName} (${item.deliveryOrder.orderNumber})`;
            const content = `This is an automated service alert.

Asset: ${item.product.name}
Category: ${item.product.category}
Customer: ${item.deliveryOrder.customerName}
Delivery Order: ${item.deliveryOrder.orderNumber}
Service End Date: ${endDate.toLocaleDateString()}
Status: ${label}

Please take immediate action to renew this contract or contact the customer.

— ActiveIMS Automated Alerts`;

            // 1. Create Message Record
            const message = await prisma.message.create({
                data: {
                    subject,
                    content,
                    category: 'TASK',
                    priority,
                    isSystemGenerated: true,
                    customerName: item.deliveryOrder.customerName,
                    deliveryOrderNumber: item.deliveryOrder.orderNumber,
                    recipientRoleId: accMgrRole?.id || null
                }
            });

            // 2. Dispatch Receipts
            const receipts = [];

            // Direct to Sales Rep User(s)
            if (item.deliveryOrder.salesRep?.users) {
                for (const repUser of item.deliveryOrder.salesRep.users) {
                    receipts.push({ messageId: message.id, userId: repUser.id });
                }
            }

            // Direct to all ACC-MGRs (as role-based)
            if (accMgrRole) {
                const accMgrs = await prisma.user.findMany({
                    where: { roleId: accMgrRole.id, isActive: true },
                    select: { id: true }
                });
                for (const mgr of accMgrs) {
                    // Avoid duplicate if sales rep is also acc mgr
                    if (!receipts.some(r => r.userId === mgr.id)) {
                        receipts.push({ messageId: message.id, userId: mgr.id });
                    }
                }
            }

            if (receipts.length > 0) {
                await prisma.messageReceipt.createMany({
                    data: receipts
                });
            }

            // 3. Update Item
            await prisma.deliveryOrderItem.update({
                where: { id: item.id },
                data: {
                    [alertType === 'EXPIRED' ? 'expiredAlertSentAt' : 'expiryAlertSentAt']: now
                }
            });

            alertsSent++;
        }

        return NextResponse.json({
            success: true,
            alertsSent,
            message: `Dispatched ${alertsSent} alert messages.`
        });
    } catch (error: any) {
        console.error('[service-alerts] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
