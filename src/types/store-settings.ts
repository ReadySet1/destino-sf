import { z } from 'zod';

// Store settings validation schema
export const StoreSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(2, 'State required'),
  zipCode: z.string().min(5, 'ZIP code required'),
  taxRate: z.number().min(0).max(100),
  minOrderAmount: z.number().min(0),
  cateringMinimumAmount: z.number().min(0),
  minimumAdvanceHours: z.number().min(0),
  maximumDaysInAdvance: z.number().min(1),
  isOpenForOrders: z.boolean(),
});

export type StoreSettings = z.infer<typeof StoreSettingsSchema>;

// Store settings update schema (all fields optional)
export const StoreSettingsUpdateSchema = StoreSettingsSchema.partial();
export type StoreSettingsUpdate = z.infer<typeof StoreSettingsUpdateSchema>;

// Usage tracking interface
export interface StoreSettingsUsage {
  taxCalculation: boolean;
  orderMinimums: boolean;
  cateringMinimums: boolean;
  customerNotifications: boolean;
  shippingLabels: boolean;
}

// Store settings with usage metadata
export interface StoreSettingsWithUsage extends StoreSettings {
  usage: StoreSettingsUsage;
  lastUpdated: Date;
  updatedBy?: string;
}

// Store business hours
export const BusinessHoursSchema = z.object({
  monday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  tuesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  wednesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  thursday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  friday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  saturday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  sunday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
});

export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
