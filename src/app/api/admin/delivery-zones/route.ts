import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

// Schema for delivery zone validation
const deliveryZoneSchema = z.object({
  id: z.string().optional(),
  zone: z.string().min(1, 'Zone identifier is required'),
  name: z.string().min(1, 'Zone name is required'),
  description: z.string().optional().nullable(),
  minimumAmount: z.number().min(0, 'Minimum amount must be non-negative'),
  deliveryFee: z.number().min(0, 'Delivery fee must be non-negative'),
  estimatedDeliveryTime: z.string().optional().nullable(),
  isActive: z.boolean(),
  postalCodes: z.array(z.string()).optional().default([]),
  cities: z.array(z.string()).optional().default([]),
  displayOrder: z.number().int().min(0).optional().default(0),
});

type DeliveryZoneData = z.infer<typeof deliveryZoneSchema>;

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

// GET - Fetch all delivery zones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliveryZones = await prisma.cateringDeliveryZone.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const processedZones = deliveryZones.map(zone => ({
      ...zone,
      minimumAmount: Number(zone.minimumAmount),
      deliveryFee: Number(zone.deliveryFee),
    }));

    return NextResponse.json({ deliveryZones: processedZones });
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update delivery zone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    try {
      deliveryZoneSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: error.errors 
        }, { status: 400 });
      }
      throw error;
    }

    const zoneData: DeliveryZoneData = body;

    let result;
    
    if (zoneData.id) {
      // Update existing zone
      result = await prisma.cateringDeliveryZone.update({
        where: { id: zoneData.id },
        data: {
          zone: zoneData.zone,
          name: zoneData.name,
          description: zoneData.description,
          minimumAmount: zoneData.minimumAmount,
          deliveryFee: zoneData.deliveryFee,
          estimatedDeliveryTime: zoneData.estimatedDeliveryTime,
          isActive: zoneData.isActive,
          postalCodes: zoneData.postalCodes,
          cities: zoneData.cities,
          displayOrder: zoneData.displayOrder,
        },
      });
    } else {
      // Create new zone
      result = await prisma.cateringDeliveryZone.create({
        data: {
          zone: zoneData.zone,
          name: zoneData.name,
          description: zoneData.description,
          minimumAmount: zoneData.minimumAmount,
          deliveryFee: zoneData.deliveryFee,
          estimatedDeliveryTime: zoneData.estimatedDeliveryTime,
          isActive: zoneData.isActive,
          postalCodes: zoneData.postalCodes || [],
          cities: zoneData.cities || [],
          displayOrder: zoneData.displayOrder || 0,
        },
      });
    }

    return NextResponse.json({
      message: zoneData.id ? 'Zone updated successfully' : 'Zone created successfully',
      zone: {
        ...result,
        minimumAmount: Number(result.minimumAmount),
        deliveryFee: Number(result.deliveryFee),
      },
    });
  } catch (error) {
    console.error('Error saving delivery zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update multiple zones (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { zones } = body;

    if (!Array.isArray(zones)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Validate all zones
    const validatedZones = zones.map(zone => deliveryZoneSchema.parse(zone));

    // Update zones in transaction
    const results = await prisma.$transaction(
      validatedZones.map(zone => 
        prisma.cateringDeliveryZone.update({
          where: { id: zone.id },
          data: {
            zone: zone.zone,
            name: zone.name,
            description: zone.description,
            minimumAmount: zone.minimumAmount,
            deliveryFee: zone.deliveryFee,
            estimatedDeliveryTime: zone.estimatedDeliveryTime,
            isActive: zone.isActive,
            postalCodes: zone.postalCodes,
            cities: zone.cities,
            displayOrder: zone.displayOrder,
          },
        })
      )
    );

    const processedResults = results.map(result => ({
      ...result,
      minimumAmount: Number(result.minimumAmount),
      deliveryFee: Number(result.deliveryFee),
    }));

    return NextResponse.json({
      message: 'Delivery zones updated successfully',
      zones: processedResults,
    });
  } catch (error) {
    console.error('Error updating delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 