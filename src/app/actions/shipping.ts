'use server';

import { z } from 'zod';
import { Shippo } from 'shippo';

// --- Schemas --- 
const addressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional(),
});

const shippingRateRequestSchema = z.object({
  shippingAddress: addressSchema,
  // TODO: Add product dimensions/weight calculation logic here
  // For now, using a placeholder weight
  estimatedWeightLb: z.number().positive(),
  estimatedLengthIn: z.number().positive().optional().default(10),
  estimatedWidthIn: z.number().positive().optional().default(8),
  estimatedHeightIn: z.number().positive().optional().default(4),
});

// --- Types ---
export interface ShippingRate {
  id: string;       // Shippo Rate object ID
  name: string;     // e.g., "USPS Priority Mail (Est. 2 days)"
  amount: number;   // Cost in cents
  carrier: string;  // e.g., "USPS"
  serviceLevelToken: string; // e.g., "usps_priority"
  estimatedDays?: number;
}

type ShippingRateRequestInput = z.infer<typeof shippingRateRequestSchema>;

// --- Server Action Implementation: getShippingRates (Updated Payload Keys) ---
export async function getShippingRates(
  input: ShippingRateRequestInput
): Promise<{ success: boolean; rates?: ShippingRate[]; error?: string }> {
    console.log("Server Action: getShippingRates started with input:", input);

    const apiKey = process.env.SHIPPO_API_KEY;
    console.log("Value of process.env.SHIPPO_API_KEY:", apiKey);
    if (!apiKey) {
        console.error("Shippo API Key not configured.");
        return { success: false, error: "Shipping provider configuration error." };
    }

    // Define origin address *within* the scope where it's needed or pass it
    const originAddress = {
        name: process.env.SHIPPING_ORIGIN_NAME,
        street1: process.env.SHIPPING_ORIGIN_STREET1,
        city: process.env.SHIPPING_ORIGIN_CITY,
        state: process.env.SHIPPING_ORIGIN_STATE,
        zip: process.env.SHIPPING_ORIGIN_ZIP,
        country: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
        phone: process.env.SHIPPING_ORIGIN_PHONE,
        email: process.env.SHIPPING_ORIGIN_EMAIL,
    };
    
    // Add check for origin name
    if (!originAddress.street1 || !originAddress.city || !originAddress.state || !originAddress.zip || !originAddress.name) { 
      console.error("Missing required shipping origin address details (Name, Street, City, State, Zip) in environment variables.");
      return { success: false, error: "Shipping origin configuration error." };
    }

    const shippo = new Shippo({ // Define shippo client instance
        apiKeyHeader: apiKey,
    });

    const { shippingAddress, estimatedWeightLb, estimatedLengthIn, estimatedWidthIn, estimatedHeightIn } = input;

    try {
        console.log("Creating shipment object with Shippo...");

        const parcelData = {
            length: estimatedLengthIn?.toString() ?? '10',
            width: estimatedWidthIn?.toString() ?? '8',
            height: estimatedHeightIn?.toString() ?? '4',
            distanceUnit: 'in' as const,
            weight: estimatedWeightLb.toString(),
            massUnit: 'lb' as const,
        };
        // console.log("Parcel Data:", parcelData);

        const addressToData = {
            name: shippingAddress.recipientName || '',
            street1: shippingAddress.street,
            street2: shippingAddress.street2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.postalCode,
            country: 'US',
            validate: true,
        };
        // console.log("Address To Data:", addressToData);

        // Use camelCase keys for Shippo SDK
        const shipmentPayload = {
            addressFrom: originAddress, // camelCase
            addressTo: addressToData,   // camelCase
            parcels: [parcelData],
            async: false
        } as any; // Use type assertion to any to avoid TypeScript errors
        
        const shipmentResult: any = await shippo.shipments.create(shipmentPayload); // Use any type for result
        console.log("Raw Shippo Shipment Create Result:", JSON.stringify(shipmentResult, null, 2));

        // --- Updated Address Validation Check --- 
        const validationResults = shipmentResult.addressTo?.validationResults;
        // Check if validation failed OR if there are any warning/error messages
        if (validationResults && (!validationResults.isValid || (validationResults.messages && validationResults.messages.length > 0))) {
            const validationMessages = validationResults.messages || [];
            // Prioritize error messages, then warnings, then generic
            const errorText = validationMessages.find((m: any) => m.type === 'address_error')?.text;
            const warningText = validationMessages.find((m: any) => m.type === 'address_warning')?.text;
            const errorMessage = errorText || warningText || "Invalid or incomplete shipping address provided.";
            
            console.warn("Shippo address validation failed or has warnings:", errorMessage);
            // Provide a slightly more informative error type
            const errorType = errorText ? "Validation Error" : (warningText ? "Address Warning" : "Validation Issue");
            return { success: false, error: `${errorType}: ${errorMessage}` }; // Return validation error/warning
        }
        // --- END Address Validation Check ---

        // Original check for general shipment failure or no rates (can likely be simplified now)
        // if (shipmentResult.object_state === 'INVALID' || !shipmentResult.rates || shipmentResult.rates.length === 0) {
        // Check ONLY if rates array exists and is not empty 
        if (!shipmentResult.rates || shipmentResult.rates.length === 0) {
            console.warn("Shippo shipment creation returned no rates:", shipmentResult.messages);
            // Construct error message from general messages if available
            const errorMsg = shipmentResult.messages?.map((m: any) => m.text).join(', ') || 'No shipping rates found for this address/parcel.';
            return { success: false, error: errorMsg }; 
        }

        const rates: ShippingRate[] = shipmentResult.rates
            .map((rate: any) => ({
                id: rate.objectId,
                name: `${rate.provider} ${rate.servicelevel.name} (Est. ${rate.estimatedDays || 'N/A'} days)`,
                amount: Math.round(parseFloat(rate.amount) * 100),
                carrier: rate.provider,
                serviceLevelToken: rate.servicelevel.token,
                estimatedDays: rate.estimatedDays,
            }))
            .sort((a: ShippingRate, b: ShippingRate) => a.amount - b.amount);

        console.log("Formatted Rates:", rates);

        if (rates.length === 0) {
            return { success: false, error: 'No valid shipping options available for this address.' }; // RETURN ERROR
        }

        return { success: true, rates: rates }; // RETURN SUCCESS

    } catch (error: any) {
        console.error("Shippo API Error in getShippingRates:", error);
        let errorMessage = 'Failed to fetch shipping rates due to an unexpected error.';
        if (error?.body?.detail) {
            errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage }; // RETURN ERROR
    }
} 