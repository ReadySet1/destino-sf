'use server';

import { z } from 'zod';
import { Shippo } from 'shippo';
import { calculateShippingWeight, type CartItemForShipping } from '@/lib/shippingUtils';

// --- Enhanced Schemas for Shippo Integration --- 
const addressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional().default('US'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

const cartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  variantId: z.string().optional(),
  price: z.number().optional(), // For customs and insurance purposes
});

const shippingRateRequestSchema = z.object({
  shippingAddress: addressSchema,
  cartItems: z.array(cartItemSchema),
  estimatedLengthIn: z.number().positive().optional().default(10),
  estimatedWidthIn: z.number().positive().optional().default(8),
  estimatedHeightIn: z.number().positive().optional().default(4),
  insuranceAmount: z.number().optional(), // For valuable shipments
  extraServices: z.array(z.string()).optional(), // Additional Shippo services
});

// --- Enhanced Types ---
export interface ShippingRate {
  id: string;
  name: string;
  amount: number;
  carrier: string;
  serviceLevelToken: string;
  estimatedDays?: number;
  currency: string;
  providerImage75?: string; // Carrier logo from Shippo
  providerImage200?: string;
  attributes?: string[]; // Service attributes (e.g., "CHEAPEST", "FASTEST")
  zone?: string; // Shipping zone
  arrives_by?: string; // Expected delivery date
}

export interface ShippoShipmentMetadata {
  orderId?: string;
  customerEmail?: string;
  productTypes: string[];
  totalWeight: number;
  itemCount: number;
  estimatedValue: number;
}

type ShippingRateRequestInput = z.infer<typeof shippingRateRequestSchema>;

// --- Enhanced Shippo Integration with Full Feature Support ---
export async function getShippingRates(
  input: ShippingRateRequestInput
): Promise<{ success: boolean; rates?: ShippingRate[]; error?: string; shipmentId?: string }> {
    console.log("🚢 Shippo Integration: getShippingRates started with input:", input);

    const apiKey = process.env.SHIPPO_API_KEY;
    console.log("🔑 Shippo API Key:", apiKey ? "✅ Configured" : "❌ Not configured");
    
    if (!apiKey) {
        console.error("❌ Shippo API Key not configured.");
        return { success: false, error: "Shipping provider configuration error." };
    }

    // Enhanced origin address configuration
    const originAddress = {
        name: process.env.SHIPPING_ORIGIN_NAME || 'Destino SF',
        company: process.env.SHIPPING_ORIGIN_COMPANY || 'Destino SF',
        street1: process.env.SHIPPING_ORIGIN_STREET1,
        street2: process.env.SHIPPING_ORIGIN_STREET2,
        city: process.env.SHIPPING_ORIGIN_CITY,
        state: process.env.SHIPPING_ORIGIN_STATE,
        zip: process.env.SHIPPING_ORIGIN_ZIP,
        country: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
        phone: process.env.SHIPPING_ORIGIN_PHONE,
        email: process.env.SHIPPING_ORIGIN_EMAIL,
        validate: true, // Validate origin address with Shippo
    };
    
    // Validate required origin address fields
    if (!originAddress.street1 || !originAddress.city || !originAddress.state || !originAddress.zip) { 
        console.error("❌ Missing required shipping origin address details in environment variables.");
        return { success: false, error: "Shipping origin configuration error." };
    }

    const shippo = new Shippo({
        apiKeyHeader: apiKey,
        shippoApiVersion: '2018-02-08', // Use stable API version
    });

    const { shippingAddress, cartItems, estimatedLengthIn, estimatedWidthIn, estimatedHeightIn, insuranceAmount, extraServices } = input;

    try {
        console.log("⚖️ Calculating dynamic shipping weight for cart items...");
        
        // Calculate weight based on cart items for nationwide shipping
        const estimatedWeightLb = await calculateShippingWeight(cartItems, 'nationwide_shipping');
        
        console.log(`📦 Calculated shipping weight: ${estimatedWeightLb} lbs for ${cartItems.length} unique items`);
        console.log("🛍️ Cart items breakdown:", cartItems.map(item => `${item.name} (qty: ${item.quantity})`));

        // Calculate estimated value for insurance purposes
        const estimatedValue = cartItems.reduce((total, item) => {
            return total + (item.price || 25) * item.quantity; // Default $25 per item if price not provided
        }, 0);

        // Create metadata for tracking and analytics
        const shipmentMetadata: ShippoShipmentMetadata = {
            productTypes: [...new Set(cartItems.map(item => {
                if (item.name.toLowerCase().includes('alfajor')) return 'alfajores';
                if (item.name.toLowerCase().includes('empanada')) return 'empanadas';
                return 'other';
            }))],
            totalWeight: estimatedWeightLb,
            itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            estimatedValue: estimatedValue,
        };

        console.log("📊 Shipment metadata:", shipmentMetadata);

        // Enhanced parcel data with better categorization
        const parcelData = {
            length: estimatedLengthIn?.toString() ?? '10',
            width: estimatedWidthIn?.toString() ?? '8',
            height: estimatedHeightIn?.toString() ?? '4',
            distance_unit: 'in' as const,
            weight: estimatedWeightLb.toString(),
            mass_unit: 'lb' as const,
            template: '', // Can be used for standard package sizes
            metadata: JSON.stringify({
                product_types: shipmentMetadata.productTypes,
                item_count: shipmentMetadata.itemCount,
            }),
        };

        console.log("📦 Enhanced Parcel Data:", parcelData);

        // Enhanced destination address with better validation
        const addressToData = {
            name: shippingAddress.recipientName || 'Customer',
            company: '', // Can be filled if B2B
            street1: shippingAddress.street,
            street2: shippingAddress.street2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.postalCode,
            country: shippingAddress.country || 'US',
            phone: shippingAddress.phone || '',
            email: shippingAddress.email || '',
            validate: true, // Enable Shippo address validation
        };

        console.log("🏠 Enhanced Address To Data:", addressToData);

        // Enhanced shipment payload with additional Shippo features
        const shipmentPayload = {
            addressFrom: originAddress,
            addressTo: addressToData,
            parcels: [parcelData],
            async: false, // Synchronous for immediate rate retrieval
            // Add metadata for tracking and analytics
            metadata: JSON.stringify({
                source: 'destino_sf_website',
                order_type: 'food_delivery',
                ...shipmentMetadata,
                timestamp: new Date().toISOString(),
            }),
        } as any; // Temporarily use any to avoid complex type mismatches

        console.log("🚢 Creating enhanced Shippo shipment...");
        const shipmentResult = await shippo.shipments.create(shipmentPayload);
        
        console.log("📋 Shippo Shipment Created:", {
            id: shipmentResult.objectId,
            status: shipmentResult.status,
            rates_count: shipmentResult.rates?.length || 0,
        });

        // Enhanced address validation with detailed error handling
        const validationResults = shipmentResult.addressTo?.validationResults;
        if (validationResults && (!validationResults.isValid || (validationResults.messages && validationResults.messages.length > 0))) {
            const validationMessages = validationResults.messages || [];
            const errorText = validationMessages.find((m: any) => m.type === 'address_error')?.text;
            const warningText = validationMessages.find((m: any) => m.type === 'address_warning')?.text;
            const errorMessage = errorText || warningText || "Invalid or incomplete shipping address provided.";
            
            console.warn("⚠️ Shippo address validation failed:", errorMessage);
            const errorType = errorText ? "Validation Error" : (warningText ? "Address Warning" : "Validation Issue");
            return { 
                success: false, 
                error: `${errorType}: ${errorMessage}`,
                shipmentId: shipmentResult.objectId,
            };
        }

        // Check for rates availability
        if (!shipmentResult.rates || shipmentResult.rates.length === 0) {
            console.warn("⚠️ Shippo shipment creation returned no rates:", shipmentResult.messages);
            const errorMsg = shipmentResult.messages?.map((m: any) => m.text).join(', ') || 'No shipping rates found for this address/parcel.';
            return { 
                success: false, 
                error: errorMsg,
                shipmentId: shipmentResult.objectId,
            };
        }

        // Enhanced rate mapping with additional Shippo data
        const rates: ShippingRate[] = shipmentResult.rates
            .filter((rate: any) => rate.available) // Only include available rates
                         .map((rate: any) => ({
                 id: rate.objectId,
                 name: `${rate.provider} ${rate.servicelevel.name}${rate.estimatedDays ? ` (Est. ${rate.estimatedDays} days)` : ''}`,
                 amount: Math.round(parseFloat(rate.amount) * 100), // Convert to cents
                 carrier: rate.provider,
                 serviceLevelToken: rate.servicelevel.token,
                 estimatedDays: rate.estimatedDays,
                 currency: rate.currency,
                 providerImage75: rate.providerImage75,
                 providerImage200: rate.providerImage200,
                 attributes: rate.attributes || [],
                 zone: rate.zone,
                 arrives_by: rate.arrivesBy,
             }))
            .sort((a: ShippingRate, b: ShippingRate) => {
                // Smart sorting: prioritize by attributes first, then by price
                const aIsFastest = a.attributes?.includes('FASTEST');
                const bIsFastest = b.attributes?.includes('FASTEST');
                const aIsCheapest = a.attributes?.includes('CHEAPEST');
                const bIsCheapest = b.attributes?.includes('CHEAPEST');
                
                // If one is fastest and the other isn't, prioritize fastest
                if (aIsFastest && !bIsFastest) return -1;
                if (bIsFastest && !aIsFastest) return 1;
                
                // If one is cheapest and the other isn't, prioritize cheapest
                if (aIsCheapest && !bIsCheapest) return -1;
                if (bIsCheapest && !aIsCheapest) return 1;
                
                // Otherwise sort by price
                return a.amount - b.amount;
            });

        console.log("💰 Enhanced Formatted Rates:", rates.map(r => ({
            carrier: r.carrier,
            name: r.name,
            amount: `$${(r.amount / 100).toFixed(2)}`,
            attributes: r.attributes,
        })));

        if (rates.length === 0) {
            return { 
                success: false, 
                error: 'No valid shipping options available for this address.',
                shipmentId: shipmentResult.objectId,
            };
        }

        return { 
            success: true, 
            rates: rates,
            shipmentId: shipmentResult.objectId,
        };

    } catch (error: any) {
        console.error("❌ Shippo API Error in getShippingRates:", error);
        let errorMessage = 'Failed to fetch shipping rates due to an unexpected error.';
        
        // Enhanced error handling for different Shippo error types
        if (error?.response?.data) {
            const errorData = error.response.data;
            if (errorData.detail) {
                errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }
        } else if (error?.body?.detail) {
            errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return { success: false, error: errorMessage };
    }
}

// --- New Function: Create Shipping Label (Full Shippo Integration) ---
export async function createShippingLabel(
  rateId: string,
  orderMetadata?: { orderId?: string; customerEmail?: string }
): Promise<{ success: boolean; label?: any; error?: string }> {
    console.log("🏷️ Creating shipping label with Shippo for rate:", rateId);

    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
        return { success: false, error: "Shipping provider configuration error." };
    }

    const shippo = new Shippo({
        apiKeyHeader: apiKey,
        shippoApiVersion: '2018-02-08',
    });

    try {
        // Create transaction (purchase label) with enhanced metadata
        const transaction = await shippo.transactions.create({
            rate: rateId,
            labelFileType: 'PDF',
            async: false,
            metadata: JSON.stringify({
                source: 'destino_sf_website',
                ...orderMetadata,
                created_at: new Date().toISOString(),
            }),
        });

        if (transaction.status === 'SUCCESS') {
            console.log("✅ Shipping label created successfully:", transaction.objectId);
            return {
                success: true,
                label: {
                    id: transaction.objectId,
                    status: transaction.status,
                    labelUrl: transaction.labelUrl,
                    trackingNumber: transaction.trackingNumber,
                    eta: transaction.eta,
                    trackingUrlProvider: transaction.trackingUrlProvider,
                },
            };
        } else {
            console.error("❌ Label creation failed:", transaction.messages);
            return {
                success: false,
                error: transaction.messages?.map((m: any) => m.text).join(', ') || 'Failed to create shipping label',
            };
        }
    } catch (error: any) {
        console.error("❌ Error creating shipping label:", error);
        return {
            success: false,
            error: error.message || 'Failed to create shipping label',
        };
    }
} 