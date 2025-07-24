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

// Helper function to check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// GET - Fetch all delivery zones
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/delivery-zones - Fetching delivery zones');
    
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      console.log('❌ Unauthorized access attempt to delivery zones API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliveryZones = await prisma.cateringDeliveryZone.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const processedZones = deliveryZones.map(zone => ({
      ...zone,
      minimumAmount: Number(zone.minimumAmount),
      deliveryFee: Number(zone.deliveryFee),
      // Map database 'active' field to frontend 'isActive'
      isActive: zone.active,
    }));

    console.log(`✅ Successfully fetched ${processedZones.length} delivery zones`);
    return NextResponse.json({ deliveryZones: processedZones });
  } catch (error) {
    console.error('❌ Error fetching delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update delivery zone
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/admin/delivery-zones - Processing request');
    
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      console.log('❌ Unauthorized access attempt to delivery zones API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    // Validate request body
    let zoneData: DeliveryZoneData;
    try {
      zoneData = deliveryZoneSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Validation error:', error.errors);
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

    let result;
    const isUpdate = !!zoneData.id;

    try {
      if (isUpdate) {
        // Update existing zone
        console.log(`🔄 Updating zone with ID: ${zoneData.id}`);
        
        // First, check if zone exists
        const existingZone = await prisma.cateringDeliveryZone.findUnique({
          where: { id: zoneData.id },
        });

        if (!existingZone) {
          console.log(`❌ Zone not found with ID: ${zoneData.id}`);
          return NextResponse.json(
            { error: 'Zone not found' },
            { status: 404 }
          );
        }

        result = await prisma.cateringDeliveryZone.update({
          where: { id: zoneData.id },
          data: {
            zone: zoneData.zone,
            name: zoneData.name,
            description: zoneData.description,
            minimumAmount: zoneData.minimumAmount,
            deliveryFee: zoneData.deliveryFee,
            estimatedDeliveryTime: zoneData.estimatedDeliveryTime,
            active: zoneData.isActive, // Map frontend isActive to database active
            postalCodes: zoneData.postalCodes,
            cities: zoneData.cities,
            displayOrder: zoneData.displayOrder,
          },
        });
        
        console.log(`✅ Zone updated successfully: ${result.name}`);
      } else {
        // Create new zone
        console.log('🔄 Creating new zone');
        
        result = await prisma.cateringDeliveryZone.create({
          data: {
            zone: zoneData.zone,
            name: zoneData.name,
            description: zoneData.description,
            minimumAmount: zoneData.minimumAmount,
            deliveryFee: zoneData.deliveryFee,
            estimatedDeliveryTime: zoneData.estimatedDeliveryTime,
            active: zoneData.isActive, // Map frontend isActive to database active
            postalCodes: zoneData.postalCodes || [],
            cities: zoneData.cities || [],
            displayOrder: zoneData.displayOrder || 0,
          },
        });
        
        console.log(`✅ Zone created successfully: ${result.name}`);
      }

      // Process result for response
      const processedResult = {
        ...result,
        minimumAmount: Number(result.minimumAmount),
        deliveryFee: Number(result.deliveryFee),
        isActive: result.active, // Map database active back to frontend isActive
      };

      const message = isUpdate ? 'Zone updated successfully' : 'Zone created successfully';
      
      console.log(`✅ ${message}: ${processedResult.name} (Active: ${processedResult.isActive})`);
      
      return NextResponse.json({
        message,
        zone: processedResult,
      });
      
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      
      // Handle specific database errors
      if (dbError instanceof Error) {
        if (dbError.message.includes('Unique constraint')) {
          return NextResponse.json(
            { error: 'Zone identifier already exists' },
            { status: 409 }
          );
        }
      }
      
      throw dbError;
    }
    
  } catch (error) {
    console.error('❌ Error in delivery zones POST:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update multiple zones (bulk update)
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 PUT /api/admin/delivery-zones - Bulk update request');
    
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      console.log('❌ Unauthorized access attempt to delivery zones API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { zones } = body;

    if (!Array.isArray(zones)) {
      console.log('❌ Invalid request format: zones is not an array');
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    console.log(`🔄 Processing bulk update for ${zones.length} zones`);

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
            active: zone.isActive, // Map frontend isActive to database active
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
      isActive: result.active, // Map database active back to frontend isActive
    }));

    console.log(`✅ Successfully updated ${processedResults.length} zones`);
    
    return NextResponse.json({
      message: 'Delivery zones updated successfully',
      zones: processedResults,
    });
  } catch (error) {
    console.error('❌ Error updating delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
