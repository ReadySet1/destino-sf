import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { updateShippingConfiguration } from '@/lib/shippingUtils';

// Schema for validation
const configurationSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  baseWeightLb: z.number().min(0.1, 'Base weight must be at least 0.1 lbs').max(50, 'Base weight cannot exceed 50 lbs'),
  weightPerUnitLb: z.number().min(0, 'Per-unit weight cannot be negative').max(50, 'Per-unit weight cannot exceed 50 lbs'),
  isActive: z.boolean(),
  applicableForNationwideOnly: z.boolean(),
});

const requestSchema = z.object({
  configurations: z.array(configurationSchema),
});

type RequestData = z.infer<typeof requestSchema>;

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

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
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: error.errors 
        }, { status: 400 });
      }
      throw error;
    }

    const { configurations }: RequestData = body;

    // Update each configuration
    const updatedConfigurations = [];
    for (const config of configurations) {
      try {
        const updatedConfig = await updateShippingConfiguration(
          config.productName,
          {
            baseWeightLb: config.baseWeightLb,
            weightPerUnitLb: config.weightPerUnitLb,
            isActive: config.isActive,
            applicableForNationwideOnly: config.applicableForNationwideOnly,
          }
        );
        updatedConfigurations.push(updatedConfig);
      } catch (error) {
        console.error(`Failed to update configuration for ${config.productName}:`, error);
        // Continue with other configurations instead of failing entirely
      }
    }

    return NextResponse.json({
      message: 'Shipping configurations updated successfully',
      configurations: updatedConfigurations,
    });
  } catch (error) {
    console.error('Error updating shipping configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // This route is mainly for POST, but we can return current configurations if needed
    const { getAllShippingConfigurations } = await import('@/lib/shippingUtils');
    const configurations = await getAllShippingConfigurations();

    return NextResponse.json({
      configurations,
    });
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 