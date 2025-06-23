'use server';

import { Shippo } from 'shippo';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

// TODO: Add error handling and more robust return types
export async function purchaseShippingLabel(orderId: string, shippoRateId: string): Promise<{ success: boolean; labelUrl?: string; trackingNumber?: string; error?: string }> {
    console.log(`Attempting to purchase label for Order ID: ${orderId} using Shippo Rate ID: ${shippoRateId}`);

    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
        console.error("Shippo API Key not configured for label purchase.");
        return { success: false, error: "Shipping provider configuration error." };
    }

    const shippo = new Shippo({ apiKeyHeader: apiKey });

    try {
        const transaction = await shippo.transactions.create({
            rate: shippoRateId,
            labelFileType: "PDF_4x6",
            async: false,
            metadata: `order_id=${orderId}`
        });

        console.log("Shippo Transaction Result:", JSON.stringify(transaction, null, 2));

        // Check transaction status
        if (transaction.status === 'SUCCESS' && transaction.labelUrl && transaction.trackingNumber) {
            console.log(`Label purchased successfully for Order ID: ${orderId}`);

            // Update the order in Prisma with tracking info
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    trackingNumber: transaction.trackingNumber,
                    // Optionally store label URL if needed (consider security/access)
                    // notes: `Label URL: ${transaction.labelUrl}` // Example: store in notes
                    status: OrderStatus.SHIPPING,
                }
            });
            console.log(`Order ${orderId} updated with tracking number and status.`);

            return {
                success: true,
                labelUrl: transaction.labelUrl,
                trackingNumber: transaction.trackingNumber
            };
        } else {
            // Handle errors or non-success statuses
            const errorMessage = transaction.messages?.map((m: any) => m.text).join(', ') || `Label purchase failed with status: ${transaction.status}`;
            console.error(`Failed to purchase label for Order ID: ${orderId}. Status: ${transaction.status}, Messages: ${errorMessage}`);
            // Optionally update order status to indicate label failure
            await prisma.order.update({
                where: { id: orderId },
                data: { notes: `Label purchase failed: ${errorMessage}` }
            }).catch(e => console.error("Failed to update order notes on label failure:", e));
            return { success: false, error: errorMessage };
        }

    } catch (error: any) {
        console.error(`Error purchasing shipping label for Order ID: ${orderId}:`, error);
        let errorMessage = 'Failed to purchase shipping label due to an unexpected error.';
        if (error?.body?.detail) {
            errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        // Optionally update order status/notes on error
        await prisma.order.update({
             where: { id: orderId },
             data: { notes: `Label purchase error: ${errorMessage}` }
        }).catch(e => console.error("Failed to update order notes on label purchase error:", e));
        return { success: false, error: errorMessage };
    }
} 