import { z } from 'zod';

// Branded type for zone ID
export type DeliveryZoneId = string & { readonly brand: unique symbol };

// Request/Response schemas
export const DeliveryZoneRequestSchema = z.object({
  zone: z.string().min(1, 'Zone identifier is required'),
  name: z.string().min(1, 'Zone name is required'),
  description: z.string().optional(),
  minimumAmount: z.number().min(0, 'Minimum must be non-negative'),
  deliveryFee: z.number().min(0, 'Fee must be non-negative'),
  estimatedDeliveryTime: z.string().optional(),
  isActive: z.boolean().default(true),
  postalCodes: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  displayOrder: z.number().int().min(0).default(0),
});

export const DeliveryZoneUpdateSchema = DeliveryZoneRequestSchema.extend({
  id: z.string().min(1, 'Zone ID is required for updates'),
});

export type DeliveryZoneRequest = z.infer<typeof DeliveryZoneRequestSchema>;
export type DeliveryZoneUpdate = z.infer<typeof DeliveryZoneUpdateSchema>;

export interface DeliveryZoneResponse {
  id: DeliveryZoneId;
  zone: string;
  name: string;
  description?: string | null;
  minimumAmount: number;
  deliveryFee: number;
  estimatedDeliveryTime?: string | null;
  isActive: boolean;
  postalCodes: string[];
  cities: string[];
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Error handling types
export type DeliveryZoneError =
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'VALIDATION'; errors: z.ZodIssue[] }
  | { type: 'NOT_FOUND'; zoneId: string }
  | { type: 'DUPLICATE'; existingZone: string }
  | { type: 'DATABASE'; message: string };

export type Result<T, E = DeliveryZoneError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Bulk operations
export const BulkDeliveryZoneUpdateSchema = z.object({
  zones: z.array(DeliveryZoneUpdateSchema).min(1, 'At least one zone required'),
});

export type BulkDeliveryZoneUpdate = z.infer<typeof BulkDeliveryZoneUpdateSchema>;

// Zone coverage validation
export const ZoneCoverageSchema = z
  .object({
    postalCode: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  })
  .refine(data => data.postalCode || data.city, {
    message: 'Either postal code or city must be provided',
    path: ['postalCode', 'city'],
  });

export type ZoneCoverage = z.infer<typeof ZoneCoverageSchema>;
