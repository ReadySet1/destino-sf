import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

// Schema for a single business hour
const businessHourSchema = z.object({
  id: z.string().optional(),
  day: z.number().int().min(0).max(6),
  openTime: z
    .string()
    .nullable()
    .refine(val => val === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
      message: 'Open time must be in HH:MM format',
    }),
  closeTime: z
    .string()
    .nullable()
    .refine(val => val === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
      message: 'Close time must be in HH:MM format',
    }),
  isClosed: z.boolean(),
  createdAt: z
    .union([
      z.date(),
      z
        .string()
        .datetime()
        .transform(val => new Date(val)),
    ])
    .optional(),
  updatedAt: z
    .union([
      z.date(),
      z
        .string()
        .datetime()
        .transform(val => new Date(val)),
    ])
    .optional(),
});

// Schema for the whole payload
const hoursPayloadSchema = z.object({
  hours: z.array(businessHourSchema),
});

type BusinessHour = z.infer<typeof businessHourSchema>;

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return false;
  }

  const adminProfile = await withRetry(
    () =>
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    3,
    'check admin profile'
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
      hoursPayloadSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              path: e.path,
              message: e.message,
              code: e.code,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { hours } = body as z.infer<typeof hoursPayloadSchema>;

    // Additional validation for business logic
    for (const hour of hours) {
      if (!hour.isClosed) {
        // Open and close times must be provided for open days
        if (!hour.openTime || !hour.closeTime) {
          return NextResponse.json(
            {
              error: `Both opening and closing times are required for day ${hour.day}`,
            },
            { status: 400 }
          );
        }

        // Open time must be before close time
        if (hour.openTime >= hour.closeTime) {
          return NextResponse.json(
            {
              error: `Opening time must be before closing time for day ${hour.day}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Process each hour
    const updatedHours = await Promise.all(
      hours.map(async (hour: BusinessHour) => {
        const existingHour = await prisma.businessHours.findFirst({
          where: { day: hour.day },
        });

        if (existingHour) {
          // Update existing business hour
          return prisma.businessHours.update({
            where: { id: existingHour.id },
            data: {
              openTime: hour.isClosed ? null : hour.openTime,
              closeTime: hour.isClosed ? null : hour.closeTime,
              isClosed: hour.isClosed,
            },
          });
        } else {
          // Create new business hour
          return prisma.businessHours.create({
            data: {
              day: hour.day,
              openTime: hour.isClosed ? null : hour.openTime,
              closeTime: hour.isClosed ? null : hour.closeTime,
              isClosed: hour.isClosed,
            },
          });
        }
      })
    );

    return NextResponse.json({
      message: 'Business hours updated successfully',
      businessHours: updatedHours,
    });
  } catch (error) {
    console.error('Error updating business hours:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
