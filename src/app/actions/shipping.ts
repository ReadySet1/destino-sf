'use server';

import { z } from 'zod';
import { Shippo } from 'shippo';
import { calculateShippingWeight, type CartItemForShipping } from '@/lib/shippingUtils';
import {
  getShippingRates as libGetShippingRates,
  createShippingLabel as libCreateLabel,
  trackShipment as libTrackShipment,
  type ShippingRate as LibShippingRate,
} from '@/lib/shipping';

// Debug environment variables in server action - only in debug mode
if (process.env.BUILD_DEBUG === 'true') {
  console.log('Server action environment check:', {
    hasShippoKey: !!process.env.SHIPPO_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    shippoKeyPrefix: process.env.SHIPPO_API_KEY
      ? process.env.SHIPPO_API_KEY.substring(0, 15) + '...'
      : 'MISSING',
  });
}

// --- Enhanced Schemas for Shippo Integration ---
const addressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required for shipping'),
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
  /** Selected USPS flat rate box information */
  selectedBox?: {
    template: string;
    displayName: string;
    boxSize: string;
  };
  /** Calculated weight in pounds */
  calculatedWeight?: number;
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
export async function getShippingRates(request: any) {
  // Call the lib function and transform the response to match our interface
  const response = await libGetShippingRates(request);

  if (!response.success || !response.rates) {
    return response;
  }

  // Transform the rates from lib interface to actions interface
  // Include selectedBox and calculatedWeight from response for display in checkout
  const transformedRates: ShippingRate[] = response.rates.map(
    (rate: LibShippingRate, index: number) => ({
      id: rate.id || `rate_${index}_${Date.now()}`, // Ensure unique ID with fallback
      name: rate.name,
      amount: rate.amount,
      carrier: rate.carrier,
      serviceLevelToken: rate.serviceLevel, // Map serviceLevel to serviceLevelToken
      estimatedDays: rate.estimatedDays,
      currency: rate.currency,
      // Include box selection info from response for checkout display
      selectedBox: response.selectedBox,
      calculatedWeight: response.calculatedWeight,
    })
  );

  // Debug log to verify unique IDs and box info
  console.log('Transformed shipping rates with IDs:', transformedRates.map(r => ({ id: r.id, name: r.name })));
  if (response.selectedBox) {
    console.log('📦 Selected box for all rates:', response.selectedBox.displayName, `(${response.calculatedWeight}lb)`);
  }

  return {
    ...response,
    rates: transformedRates,
  };
}

export const createShippingLabel = libCreateLabel;
export const trackShipment = libTrackShipment;

// (duplicate createShippingLabel function removed)
