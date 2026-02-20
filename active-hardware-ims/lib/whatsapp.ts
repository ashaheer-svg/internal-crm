import { prisma } from '@/lib/db'

/**
 * Sends a WhatsApp template message using the Meta Official Cloud API.
 * 
 * @param to The recipient's phone number with country code (e.g., "1234567890")
 * @param templateName The name of the approved template in your Meta dashboard
 * @param components The dynamic variables to inject into the template (optional)
 */
export async function sendWhatsAppTemplate(to: string, templateName: string, components: any[] = []) {
    // 1. Check if the feature is explicitly enabled in Settings
    try {
        // @ts-ignore
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'WHATSAPP_ENABLED' }
        });

        if (!setting || setting.value !== 'true') {
            console.log('WhatsApp notifications are disabled by user configuration. Skipping.');
            return { success: false, reason: 'DISABLED' };
        }
    } catch (err) {
        console.error('Failed to check WhatsApp configuration:', err);
        return { success: false, reason: 'DB_ERROR' };
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.warn('WhatsApp credentials not configured in environment variables. Skipping alert.');
        return;
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: 'en_US' // Adjust this to match your approved template's language
                    },
                    components: components
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to send WhatsApp message:', data);
            return { success: false, error: data };
        }

        console.log(`WhatsApp message sent successfully to ${to}`);
        return { success: true, data };

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return { success: false, error };
    }
}

// Helper specific to Quote Approval
export async function sendQuoteApprovedAlert(to: string, quoteNumber: string, customerName: string) {
    // Assuming the template "quote_approved_alert" has 2 positional variables in the body:
    // {{1}} = quoteNumber
    // {{2}} = customerName
    return sendWhatsAppTemplate(to, 'quote_approved_alert', [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: quoteNumber },
                { type: 'text', text: customerName }
            ]
        }
    ]);
}

// Helper specific to Delivery Shipment
export async function sendDeliveryShippedAlert(to: string, orderNumber: string) {
    // Assuming the template "delivery_shipped_alert" has 1 positional variable in the body
    return sendWhatsAppTemplate(to, 'delivery_shipped_alert', [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: orderNumber }
            ]
        }
    ]);
}

// Helper specific to Low Stock
export async function sendLowStockAlert(productName: string, currentStock: number, minStock: number) {
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    if (!adminPhone) {
        console.warn('ADMIN_WHATSAPP_NUMBER not set. Skipping low stock alert.');
        return;
    }

    // Assuming the template "low_stock_alert" has 3 variables
    return sendWhatsAppTemplate(adminPhone, 'low_stock_alert', [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: productName },
                { type: 'text', text: currentStock.toString() },
                { type: 'text', text: minStock.toString() }
            ]
        }
    ]);
}
