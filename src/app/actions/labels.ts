'use server';

import { Shippo } from 'shippo';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { getShippingRates } from '@/lib/shipping';

// Enhanced function with rate refresh capability
export async function purchaseShippingLabel(orderId: string, shippoRateId: string): Promise<{ success: boolean; labelUrl?: string; trackingNumber?: string; error?: string }> {
    console.log(`Attempting to purchase label for Order ID: ${orderId} using Shippo Rate ID: ${shippoRateId}`);

    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
        console.error("Shippo API Key not configured for label purchase.");
        return { success: false, error: "Shipping provider configuration error." };
    }

    const shippo = new Shippo({ apiKeyHeader: apiKey });

    // First, try with the original rate ID
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
            throw new Error(errorMessage);
        }

    } catch (error: any) {
        console.log(`Initial label purchase failed for Order ID: ${orderId}:`, error.message);
        
        // Check if this is a rate expiration error
        const isRateExpired = error?.body?.rate && 
            (error.body.rate.includes('not found') || error.body.rate.includes('Rate with supplied object_id not found'));
        
        if (isRateExpired) {
            console.log(`Rate expired for Order ID: ${orderId}. Attempting to refresh rates and retry...`);
            
            try {
                // Get the order details to re-fetch shipping rates
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        items: {
                            include: {
                                product: true,
                                variant: true
                            }
                        }
                    }
                });

                if (!order) {
                    return { success: false, error: "Order not found for rate refresh" };
                }

                // Parse the shipping address from order data
                let shippingAddress;
                try {
                    // Check if we have shipping address stored in rawData or other fields
                    if (order.rawData && typeof order.rawData === 'object') {
                        const rawData = order.rawData as any;
                        // Look for shipping address in various possible locations
                        shippingAddress = rawData.shippingAddress || 
                                        rawData.shipping_address ||
                                        rawData.shipment_details?.recipient?.address;
                    }
                } catch (parseError) {
                    console.error("Error parsing shipping address from order:", parseError);
                }

                if (!shippingAddress) {
                    return { 
                        success: false, 
                        error: "Cannot refresh rates: shipping address not found in order data" 
                    };
                }

                // Convert order items to the format expected by getShippingRates
                const cartItems = order.items.map(item => ({
                    id: item.productId,
                    name: item.product?.name || 'Unknown Product',
                    quantity: item.quantity,
                    variantId: item.variantId,
                    price: parseFloat(item.price.toString())
                }));

                // Re-fetch shipping rates
                const ratesResponse = await getShippingRates({
                    shippingAddress: {
                        recipientName: shippingAddress.recipientName || shippingAddress.name,
                        street: shippingAddress.street || shippingAddress.street1 || shippingAddress.address_line_1,
                        street2: shippingAddress.street2 || shippingAddress.address_line_2,
                        city: shippingAddress.city || shippingAddress.locality,
                        state: shippingAddress.state || shippingAddress.administrative_district_level_1,
                        postalCode: shippingAddress.postalCode || shippingAddress.postal_code,
                        country: shippingAddress.country || 'US'
                    },
                    cartItems,
                    estimatedLengthIn: 10,
                    estimatedWidthIn: 8,
                    estimatedHeightIn: 4
                });

                if (!ratesResponse.success || !ratesResponse.rates || ratesResponse.rates.length === 0) {
                    return { 
                        success: false, 
                        error: "Failed to refresh shipping rates: " + (ratesResponse.error || "No rates available") 
                    };
                }

                // Find a similar rate (same carrier and service level if possible)
                const originalShippingCarrier = order.shippingCarrier;
                const originalShippingMethod = order.shippingMethodName;
                
                let bestRate = ratesResponse.rates[0]; // Default to first rate
                
                // Try to find a rate matching the original carrier and service
                if (originalShippingCarrier) {
                    const matchingRate = ratesResponse.rates.find(rate => 
                        rate.carrier.toLowerCase() === originalShippingCarrier.toLowerCase()
                    );
                    if (matchingRate) {
                        bestRate = matchingRate;
                    }
                }

                console.log(`Using refreshed rate: ${bestRate.id} (${bestRate.carrier} - ${bestRate.name}) for Order ID: ${orderId}`);

                // Attempt label purchase with the new rate
                const refreshedTransaction = await shippo.transactions.create({
                    rate: bestRate.id,
                    labelFileType: "PDF_4x6",
                    async: false,
                    metadata: `order_id=${orderId}_refreshed`
                });

                if (refreshedTransaction.status === 'SUCCESS' && refreshedTransaction.labelUrl && refreshedTransaction.trackingNumber) {
                    console.log(`Label purchased successfully with refreshed rate for Order ID: ${orderId}`);

                    // Update the order with the new tracking info and rate ID
                    await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            trackingNumber: refreshedTransaction.trackingNumber,
                            shippingRateId: bestRate.id, // Update to the new rate ID
                            status: OrderStatus.SHIPPING,
                            notes: `Label purchased with refreshed rate after original rate expired`
                        }
                    });

                    return {
                        success: true,
                        labelUrl: refreshedTransaction.labelUrl,
                        trackingNumber: refreshedTransaction.trackingNumber
                    };
                } else {
                    const refreshErrorMessage = refreshedTransaction.messages?.map((m: any) => m.text).join(', ') || `Refreshed label purchase failed with status: ${refreshedTransaction.status}`;
                    throw new Error(refreshErrorMessage);
                }

            } catch (refreshError: any) {
                console.error(`Error during rate refresh for Order ID: ${orderId}:`, refreshError);
                await prisma.order.update({
                    where: { id: orderId },
                    data: { notes: `Label purchase failed after rate refresh attempt: ${refreshError.message}` }
                }).catch(e => console.error("Failed to update order notes on refresh error:", e));
                
                return { 
                    success: false, 
                    error: `Rate refresh failed: ${refreshError.message}` 
                };
            }
        } else {
            // Non-expiration error - handle normally
            console.error(`Error purchasing shipping label for Order ID: ${orderId}:`, error);
            let errorMessage = 'Failed to purchase shipping label due to an unexpected error.';
            if (error?.body?.detail) {
                errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            await prisma.order.update({
                where: { id: orderId },
                data: { notes: `Label purchase error: ${errorMessage}` }
            }).catch(e => console.error("Failed to update order notes on label purchase error:", e));
            
            return { success: false, error: errorMessage };
        }
    }
} 