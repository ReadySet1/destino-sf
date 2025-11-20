import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, withTransaction } from '@/lib/db-unified';
import { requireAdminAccess } from '@/lib/auth/admin-guard';
import { setAuditContext } from '@/lib/audit/delivery-zone-audit';
import {
  DeliveryZoneRequestSchema,
  DeliveryZoneUpdateSchema,
  BulkDeliveryZoneUpdateSchema,
  type DeliveryZoneRequest,
  type DeliveryZoneUpdate,
  type DeliveryZoneResponse,
} from '@/types/delivery-zones';

// GET - Fetch all delivery zones
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAccess();

  if (!authResult.authorized) {
    return authResult.response!;
  }

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

    return NextResponse.json({ deliveryZones: processedZones });
  } catch (error) {
    console.error('❌ Error fetching delivery zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update delivery zone
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAccess();

  if (!authResult.authorized) {
    return authResult.response!;
  }

  try {
    const body = await request.json();

    // Check if this is an update (has ID) or create (no ID)
    const isUpdate = !!body.id && body.id.trim() !== '';

    // Validate request body
    let zoneData: DeliveryZoneRequest | DeliveryZoneUpdate;
    try {
      zoneData = isUpdate
        ? DeliveryZoneUpdateSchema.parse(body)
        : DeliveryZoneRequestSchema.parse(body);
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

    try {
      // For updates, validate ID and existence before running transactional write
      let existingZone = null;
      let updateData: DeliveryZoneUpdate | null = null;

      if (isUpdate) {
        updateData = zoneData as DeliveryZoneUpdate;

        if (!updateData.id || updateData.id.trim() === '') {
          return NextResponse.json({ error: 'Missing ID for update' }, { status: 400 });
        }

        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(updateData.id)) {
          return NextResponse.json({ error: 'Invalid ID format for update' }, { status: 400 });
        }

        existingZone = await prisma.cateringDeliveryZone.findUnique({
          where: { id: updateData.id },
        });

        if (!existingZone) {
          return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }
      }

      const auditContext = {
        adminUserId: authResult.user?.id || null,
        adminEmail: authResult.user?.email || 'unknown',
        ipAddress:
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      };

      const { result } = await withTransaction(async tx => {
        await setAuditContext(auditContext, tx);

        if (isUpdate && updateData) {
          const updatedZone = await tx.cateringDeliveryZone.update({
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

          return { result: updatedZone };
        }

        const createData = zoneData as DeliveryZoneRequest;

        const createdZone = await tx.cateringDeliveryZone.create({
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

        return { result: createdZone };
      });

      // Process result for response
      const processedResult = {
        ...result,
        minimumAmount: Number(result.minimumAmount),
        deliveryFee: Number(result.deliveryFee),
        isActive: result.active, // Map database active back to frontend isActive
      };

      const message = isUpdate ? 'Zone updated successfully' : 'Zone created successfully';

      return NextResponse.json({
        message,
        zone: processedResult,
      });
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);

      // Handle specific database errors
      if (dbError instanceof Error) {
        if (dbError.message.includes('Unique constraint')) {
          return NextResponse.json({ error: 'Zone identifier already exists' }, { status: 409 });
        }
      }

      throw dbError;
    }
  } catch (error) {
    console.error('❌ Error in delivery zones POST:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update multiple zones (bulk update)
export async function PUT(request: NextRequest) {
  const authResult = await requireAdminAccess();

  if (!authResult.authorized) {
    return authResult.response!;
  }

  try {
    const body = await request.json();
    const { zones } = body;

    if (!Array.isArray(zones)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Validate bulk update request
    const { zones: validatedZones } = BulkDeliveryZoneUpdateSchema.parse({ zones });

    // Validate all IDs before proceeding with bulk update
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const zone of validatedZones) {
      if (!zone.id || zone.id.trim() === '') {
        return NextResponse.json({ error: 'Missing ID for bulk update' }, { status: 400 });
      }
      if (!uuidRegex.test(zone.id)) {
        return NextResponse.json(
          { error: `Invalid ID format for bulk update: ${zone.id}` },
          { status: 400 }
        );
      }
    }

    const auditContext = {
      adminUserId: authResult.user?.id || null,
      adminEmail: authResult.user?.email || 'unknown',
      ipAddress:
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const results = await withTransaction(async tx => {
      await setAuditContext(auditContext, tx);

      const updatedZones = await Promise.all(
        validatedZones.map(zone =>
          tx.cateringDeliveryZone.update({
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

      return updatedZones;
    });

    const processedResults = results.map(result => ({
      ...result,
      minimumAmount: Number(result.minimumAmount),
      deliveryFee: Number(result.deliveryFee),
      isActive: result.active, // Map database active back to frontend isActive
    }));

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
  const authResult = await requireAdminAccess();

  if (!authResult.authorized) {
    return authResult.response!;
  }

  try {
    const url = new URL(request.url);
    const zoneId = url.searchParams.get('id');

    if (!zoneId) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 });
    }

    const auditContext = {
      adminUserId: authResult.user?.id || null,
      adminEmail: authResult.user?.email || 'unknown',
      ipAddress:
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const { existingZone } = await withTransaction(async tx => {
      await setAuditContext(auditContext, tx);

      const zone = await tx.cateringDeliveryZone.findUnique({
        where: { id: zoneId },
      });

      if (!zone) {
        return { existingZone: null };
      }

      await tx.cateringDeliveryZone.delete({
        where: { id: zoneId },
      });

      return { existingZone: zone };
    });

    if (!existingZone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Delivery zone \"${existingZone.name}\" deleted successfully`,
      deletedZone: {
        id: existingZone.id,
        name: existingZone.name,
        zone: existingZone.zone,
      },
    });
  } catch (error) {
    console.error('❌ Error deleting delivery zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
