import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/auth/admin-guard';
import { prisma, withRetry } from '@/lib/db-unified';

// GET - Fetch all regular delivery zones  
export async function GET(request: NextRequest) {
  console.log('🔄 GET /api/admin/regular-delivery-zones - Starting request');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);
  
  try {
    const deliveryZones = await prisma.regularDeliveryZone.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const processedZones = deliveryZones.map(zone => ({
      ...zone,
      minimumOrderForFree: Number(zone.minimumOrderForFree),
      deliveryFee: Number(zone.deliveryFee),
      // Map database 'active' field to frontend 'isActive'
      isActive: zone.active,
    }));

    console.log(`✅ Successfully fetched ${processedZones.length} regular delivery zones`);
    return NextResponse.json({ deliveryZones: processedZones });
  } catch (error) {
    console.error('❌ Error fetching regular delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update regular delivery zone
export async function POST(request: NextRequest) {
  console.log('🔄 POST /api/admin/regular-delivery-zones - Starting request');
  
  const authResult = await requireAdminAccess();
  
  if (!authResult.authorized) {
    console.error('❌ Unauthorized access attempt:', authResult.response?.status);
    return authResult.response!;
  }

  console.log('✅ Admin verified:', authResult.user?.email);

  try {
    const requestData = await request.json();
    console.log('📦 Request data received:', requestData);

    // If it's an existing zone (has ID), update it
    if (requestData.id) {
      console.log(`🔄 Updating existing zone: ${requestData.id}`);

      // Validate ID before proceeding with database operations
      if (!requestData.id || requestData.id.trim() === '') {
        console.log('❌ Invalid ID provided for update: empty or undefined');
        return NextResponse.json(
          { error: 'Missing ID for update' },
          { status: 400 }
        );
      }

      // Validate ID format (basic UUID check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(requestData.id)) {
        console.log(`❌ Invalid ID format for update: ${requestData.id}`);
        return NextResponse.json(
          { error: 'Invalid ID format for update' },
          { status: 400 }
        );
      }

      const updatedZone = await prisma.regularDeliveryZone.update({
        where: { id: requestData.id },
        data: {
          zone: requestData.zone,
          name: requestData.name,
          description: requestData.description || null,
          minimumOrderForFree: requestData.minimumOrderForFree,
          deliveryFee: requestData.deliveryFee,
          estimatedDeliveryTime: requestData.estimatedDeliveryTime || null,
          active: requestData.isActive, // Map frontend isActive to database active
          postalCodes: requestData.postalCodes,
          cities: requestData.cities,
          displayOrder: requestData.displayOrder,
        },
      });

      const processedResult = {
        ...updatedZone,
        minimumOrderForFree: Number(updatedZone.minimumOrderForFree),
        deliveryFee: Number(updatedZone.deliveryFee),
        isActive: updatedZone.active, // Map database active back to frontend isActive
      };

      console.log('✅ Zone updated successfully:', processedResult.name);
      
      return NextResponse.json({
        message: 'Regular delivery zone updated successfully',
        zone: processedResult,
      });
    } else {
      // Create new zone
      console.log('🆕 Creating new zone:', requestData.name);

      const createdZone = await prisma.regularDeliveryZone.create({
        data: {
          zone: requestData.zone,
          name: requestData.name,
          description: requestData.description || null,
          minimumOrderForFree: requestData.minimumOrderForFree,
          deliveryFee: requestData.deliveryFee,
          estimatedDeliveryTime: requestData.estimatedDeliveryTime || null,
          active: requestData.isActive, // Map frontend isActive to database active
          postalCodes: requestData.postalCodes,
          cities: requestData.cities,
          displayOrder: requestData.displayOrder,
        },
      });

      const processedResult = {
        ...createdZone,
        minimumOrderForFree: Number(createdZone.minimumOrderForFree),
        deliveryFee: Number(createdZone.deliveryFee),
        isActive: createdZone.active, // Map database active back to frontend isActive
      };

      console.log('✅ Zone created successfully:', processedResult.name);
      
      return NextResponse.json({
        message: 'Regular delivery zone created successfully',
        zone: processedResult,
      });
    }
  } catch (error) {
    console.error('❌ Error creating/updating regular delivery zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete regular delivery zone
export async function DELETE(request: NextRequest) {
  console.log('🔄 DELETE /api/admin/regular-delivery-zones - Starting request');
  
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

    console.log(`🗑️ Attempting to delete regular zone with ID: ${zoneId}`);

    // Check if zone exists
    const existingZone = await prisma.regularDeliveryZone.findUnique({
      where: { id: zoneId }
    });

    if (!existingZone) {
      console.error(`❌ Regular zone not found: ${zoneId}`);
      return NextResponse.json({ error: 'Regular delivery zone not found' }, { status: 404 });
    }

    // Delete the zone
    await prisma.regularDeliveryZone.delete({
      where: { id: zoneId }
    });

    console.log(`✅ Successfully deleted regular zone: ${existingZone.name} (${existingZone.zone})`);
    
    return NextResponse.json({
      message: `Regular delivery zone "${existingZone.name}" deleted successfully`,
      deletedZone: {
        id: existingZone.id,
        name: existingZone.name,
        zone: existingZone.zone,
      }
    });
  } catch (error) {
    console.error('❌ Error deleting regular delivery zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
