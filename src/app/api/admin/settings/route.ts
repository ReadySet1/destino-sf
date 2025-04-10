import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

// Schema for validation
const settingsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  taxRate: z.number().min(0).max(100),
  minAdvanceHours: z.number().int().min(0),
  minOrderAmount: z.number().min(0),
  maxDaysInAdvance: z.number().int().min(1),
  isStoreOpen: z.boolean(),
  temporaryClosureMsg: z.string().optional().nullable(),
});

type SettingsData = z.infer<typeof settingsSchema>;

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return false;
  }

  const { data: userRole } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return userRole?.role === 'ADMIN';
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
      settingsSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: error.errors 
        }, { status: 400 });
      }
      throw error;
    }

    const settings: SettingsData = body;

    // Check if a settings record exists
    const existingSettings = await prisma.storeSettings.findFirst();

    let updatedSettings;
    
    if (existingSettings) {
      // Update existing settings
      updatedSettings = await prisma.storeSettings.update({
        where: { id: existingSettings.id },
        data: {
          name: settings.name,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zipCode: settings.zipCode,
          phone: settings.phone,
          email: settings.email,
          taxRate: settings.taxRate,
          minAdvanceHours: settings.minAdvanceHours,
          minOrderAmount: settings.minOrderAmount,
          maxDaysInAdvance: settings.maxDaysInAdvance,
          isStoreOpen: settings.isStoreOpen,
          temporaryClosureMsg: settings.isStoreOpen ? null : settings.temporaryClosureMsg,
        },
      });
    } else {
      // Create new settings
      updatedSettings = await prisma.storeSettings.create({
        data: {
          name: settings.name,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zipCode: settings.zipCode,
          phone: settings.phone,
          email: settings.email,
          taxRate: settings.taxRate,
          minAdvanceHours: settings.minAdvanceHours,
          minOrderAmount: settings.minOrderAmount,
          maxDaysInAdvance: settings.maxDaysInAdvance,
          isStoreOpen: settings.isStoreOpen,
          temporaryClosureMsg: settings.isStoreOpen ? null : settings.temporaryClosureMsg,
        },
      });
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 