import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Fetch all catering appetizer items
    const items = await prisma.cateringItem.findMany({
      where: {
        category: 'APPETIZER'
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isActive: true,
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        servingSize: true,
        squareItemId: true,
        squareProductId: true,
        ingredients: true,
        dietaryTags: true,
        sourceType: true,
        lastSquareSync: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { isActive: 'desc' }, // Active items first
        { name: 'asc' }       // Then alphabetical
      ]
    });
    
    logger.info(`📦 Fetched ${items.length} catering appetizer items`, { 
      userId: user.id 
    });
    
    return NextResponse.json(items);
    
  } catch (error) {
    logger.error('❌ Failed to fetch catering items:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { itemId, updates } = body;
    
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }
    
    // Validate allowed updates
    const allowedFields = [
      'name', 'description', 'price', 'isActive', 'squareProductId', 
      'isVegetarian', 'isVegan', 'isGlutenFree', 'servingSize'
    ];
    
    const updateData: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }
    
    // Update the item
    const updatedItem = await prisma.cateringItem.update({
      where: { 
        id: itemId,
        category: 'APPETIZER' // Safety check
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
    
    logger.info(`✅ Updated catering item: ${updatedItem.name}`, { 
      itemId, 
      updates: Object.keys(updateData),
      userId: user.id 
    });
    
    return NextResponse.json(updatedItem);
    
  } catch (error) {
    logger.error('❌ Failed to update catering item:', error);
    
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
