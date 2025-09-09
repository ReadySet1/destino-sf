import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, withRetry } from '@/lib/db-unified';
import { requireAdminAccess } from '@/lib/auth/admin-guard';
import { setAuditContext } from '@/lib/audit/delivery-zone-audit';
import { 
  DeliveryZoneRequestSchema, 
  DeliveryZoneUpdateSchema,
  BulkDeliveryZoneUpdateSchema,
  type DeliveryZoneRequest,
  type DeliveryZoneUpdate,
  type DeliveryZoneResponse 
} from '@/types/delivery-zones';

// GET - Fetch all delivery zones
export async function GET(request: NextRequest) {
  console.log('🔄 GET /api/admin/delivery-zones - Starting request');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);
  
  try {

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
  console.log('🔄 POST /api/admin/delivery-zones - Starting request');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);
  
  try {
    // Set audit context for this transaction
    await setAuditContext({
      adminUserId: authResult.user?.id || '',
      adminEmail: authResult.user?.email || '',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    // Validate request body
    let zoneData: DeliveryZoneRequest | DeliveryZoneUpdate;
    try {
      // Check if this is an update (has ID) or create (no ID)
      const isUpdate = !!body.id;
      zoneData = isUpdate 
        ? DeliveryZoneUpdateSchema.parse(body)
        : DeliveryZoneRequestSchema.parse(body);
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
    const isUpdate = 'id' in zoneData;

    try {
      if (isUpdate) {
        // Update existing zone
        const updateData = zoneData as DeliveryZoneUpdate;
        console.log(`🔄 Updating zone with ID: ${updateData.id}`);
        
        // Validate ID before proceeding with database operations
        if (!updateData.id || updateData.id.trim() === '') {
          console.log('❌ Invalid ID provided for update: empty or undefined');
          return NextResponse.json(
            { error: 'Missing ID for update' },
            { status: 400 }
          );
        }

        // Validate ID format (basic UUID check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(updateData.id)) {
          console.log(`❌ Invalid ID format for update: ${updateData.id}`);
          return NextResponse.json(
            { error: 'Invalid ID format for update' },
            { status: 400 }
          );
        }
        
        // First, check if zone exists
        const existingZone = await prisma.cateringDeliveryZone.findUnique({
          where: { id: updateData.id },
        });

        if (!existingZone) {
          console.log(`❌ Zone not found with ID: ${updateData.id}`);
          return NextResponse.json(
            { error: 'Zone not found' },
            { status: 404 }
          );
        }

        result = await prisma.cateringDeliveryZone.update({
          where: { id: updateData.id },
          data: {
            zone: updateData.zone,
            name: updateData.name,
            description: updateData.description,
            minimumAmount: updateData.minimumAmount,
            deliveryFee: updateData.deliveryFee,
            estimatedDeliveryTime: updateData.estimatedDeliveryTime,
            active: updateData.isActive, // Map frontend isActive to database active
            postalCodes: updateData.postalCodes,
            cities: updateData.cities,
            displayOrder: updateData.displayOrder,
          },
        });
        
        console.log(`✅ Zone updated successfully: ${result.name}`);
      } else {
        // Create new zone
        const createData = zoneData as DeliveryZoneRequest;
        console.log('🔄 Creating new zone');
        
        result = await prisma.cateringDeliveryZone.create({
          data: {
            zone: createData.zone,
            name: createData.name,
            description: createData.description,
            minimumAmount: createData.minimumAmount,
            deliveryFee: createData.deliveryFee,
            estimatedDeliveryTime: createData.estimatedDeliveryTime,
            active: createData.isActive, // Map frontend isActive to database active
            postalCodes: createData.postalCodes || [],
            cities: createData.cities || [],
            displayOrder: createData.displayOrder || 0,
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
  console.log('🔄 PUT /api/admin/delivery-zones - Starting bulk update');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);
  
  try {
    // Set audit context for bulk update
    await setAuditContext({
      adminUserId: authResult.user?.id || '',
      adminEmail: authResult.user?.email || '',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const body = await request.json();
    const { zones } = body;

    if (!Array.isArray(zones)) {
      console.log('❌ Invalid request format: zones is not an array');
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    console.log(`🔄 Processing bulk update for ${zones.length} zones`);

    // Validate bulk update request
    const { zones: validatedZones } = BulkDeliveryZoneUpdateSchema.parse({ zones });

    // Validate all IDs before proceeding with bulk update
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const zone of validatedZones) {
      if (!zone.id || zone.id.trim() === '') {
        console.log('❌ Invalid ID in bulk update: empty or undefined');
        return NextResponse.json(
          { error: 'Missing ID for bulk update' },
          { status: 400 }
        );
      }
      if (!uuidRegex.test(zone.id)) {
        console.log(`❌ Invalid ID format in bulk update: ${zone.id}`);
        return NextResponse.json(
          { error: `Invalid ID format for bulk update: ${zone.id}` },
          { status: 400 }
        );
      }
    }

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

// DELETE - Delete delivery zone
export async function DELETE(request: NextRequest) {
  console.log('🔄 DELETE /api/admin/delivery-zones - Starting request');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);

  try {
    const url = new URL(request.url);
    const zoneId = url.searchParams.get('id');

    if (!zoneId) {
      console.error('❌ Zone ID not provided');
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 });
    }

    console.log(`🗑️ Attempting to delete zone with ID: ${zoneId}`);

    // Check if zone exists
    const existingZone = await prisma.cateringDeliveryZone.findUnique({
      where: { id: zoneId }
    });

    if (!existingZone) {
      console.error(`❌ Zone not found: ${zoneId}`);
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // Delete the zone
    await prisma.cateringDeliveryZone.delete({
      where: { id: zoneId }
    });

    console.log(`✅ Successfully deleted zone: ${existingZone.name} (${existingZone.zone})`);
    
    return NextResponse.json({
      message: `Delivery zone "${existingZone.name}" deleted successfully`,
      deletedZone: {
        id: existingZone.id,
        name: existingZone.name,
        zone: existingZone.zone,
      }
    });
  } catch (error) {
    console.error('❌ Error deleting delivery zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
