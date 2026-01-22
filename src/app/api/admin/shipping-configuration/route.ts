import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
import {
  updateShippingConfiguration,
  getShippingGlobalConfig,
  updateShippingGlobalConfig,
} from '@/lib/shippingUtils';
import { getAllBoxConfigs, updateBoxConfig, type BoxConfig } from '@/lib/shipping/box-selection';

// Schema for per-product configuration
const configurationSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  baseWeightLb: z
    .number()
    .min(0.1, 'Base weight must be at least 0.1 lbs')
    .max(50, 'Base weight cannot exceed 50 lbs'),
  weightPerUnitLb: z
    .number()
    .min(0, 'Per-unit weight cannot be negative')
    .max(50, 'Per-unit weight cannot exceed 50 lbs'),
  isActive: z.boolean(),
  applicableForNationwideOnly: z.boolean(),
});

// Schema for global configuration
const globalConfigSchema = z.object({
  packagingWeightLb: z
    .number()
    .min(0, 'Packaging weight cannot be negative')
    .max(20, 'Packaging weight cannot exceed 20 lbs'),
  minimumTotalWeightLb: z
    .number()
    .min(0.1, 'Minimum total weight must be at least 0.1 lbs')
    .max(10, 'Minimum total weight cannot exceed 10 lbs'),
  isActive: z.boolean(),
});

// Schema for box configuration
const boxConfigSchema = z.object({
  boxSize: z.string().min(1, 'Box size is required'),
  template: z.string().min(1, 'Template is required'),
  maxWeightLb: z
    .number()
    .min(0.1, 'Max weight must be at least 0.1 lbs')
    .max(70, 'Max weight cannot exceed 70 lbs (USPS limit)'),
  maxItemCount: z.number().min(1, 'Max item count must be at least 1').max(100, 'Max item count cannot exceed 100'),
  isActive: z.boolean(),
  sortOrder: z.number().min(0, 'Sort order cannot be negative'),
});

const requestSchema = z.object({
  configurations: z.array(configurationSchema),
  globalConfig: globalConfigSchema.optional(),
  boxConfigs: z.array(boxConfigSchema).optional(),
});

type RequestData = z.infer<typeof requestSchema>;

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await withRetry(
    () =>
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    3,
    'check admin profile in shipping-configuration'
  );

  return adminProfile?.role === 'ADMIN';
}

export async function POST(request: NextRequest) {
  try {
    // Get Supabase client
    const supabase = await createClient();

    // Check if user is admin
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();

    try {
      requestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { configurations, globalConfig, boxConfigs }: RequestData = body;

    // Update each per-product configuration
    const updatedConfigurations = [];
    for (const config of configurations) {
      try {
        const updatedConfig = await updateShippingConfiguration(config.productName, {
          baseWeightLb: config.baseWeightLb,
          weightPerUnitLb: config.weightPerUnitLb,
          isActive: config.isActive,
          applicableForNationwideOnly: config.applicableForNationwideOnly,
        });
        updatedConfigurations.push(updatedConfig);
      } catch (error) {
        console.error(`Failed to update configuration for ${config.productName}:`, error);
        // Continue with other configurations instead of failing entirely
      }
    }

    // Update global configuration if provided
    let updatedGlobalConfig = null;
    if (globalConfig) {
      try {
        updatedGlobalConfig = await updateShippingGlobalConfig({
          packagingWeightLb: globalConfig.packagingWeightLb,
          minimumTotalWeightLb: globalConfig.minimumTotalWeightLb,
          isActive: globalConfig.isActive,
        });
        console.log('Global shipping config updated:', updatedGlobalConfig);
      } catch (error) {
        console.error('Failed to update global shipping configuration:', error);
      }
    }

    // Update box configurations if provided
    const updatedBoxConfigs: BoxConfig[] = [];
    if (boxConfigs && boxConfigs.length > 0) {
      for (const boxConfig of boxConfigs) {
        try {
          const updated = await updateBoxConfig(boxConfig.boxSize, {
            template: boxConfig.template,
            maxWeightLb: boxConfig.maxWeightLb,
            maxItemCount: boxConfig.maxItemCount,
            isActive: boxConfig.isActive,
            sortOrder: boxConfig.sortOrder,
          });
          updatedBoxConfigs.push(updated);
        } catch (error) {
          console.error(`Failed to update box configuration for ${boxConfig.boxSize}:`, error);
          // Continue with other configurations instead of failing entirely
        }
      }
      console.log('Box configs updated:', updatedBoxConfigs.length);
    }

    return NextResponse.json({
      message: 'Shipping configurations updated successfully',
      configurations: updatedConfigurations,
      globalConfig: updatedGlobalConfig,
      boxConfigs: updatedBoxConfigs.length > 0 ? updatedBoxConfigs : undefined,
    });
  } catch (error) {
    console.error('Error updating shipping configurations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Supabase client
    const supabase = await createClient();

    // Check if user is admin
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch per-product configurations, global config, and box configs
    const { getAllShippingConfigurations } = await import('@/lib/shippingUtils');
    const configurations = await getAllShippingConfigurations();
    const globalConfig = await getShippingGlobalConfig();
    const boxConfigs = await getAllBoxConfigs();

    return NextResponse.json({
      configurations,
      globalConfig,
      boxConfigs,
    });
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
