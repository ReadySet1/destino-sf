import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function testOverrideSystem() {
  try {
    console.log('🧪 Testing Override System...');

    // 1. Find a Square item to test with
    const squareItem = await prisma.cateringItem.findFirst({
      where: {
        squareProductId: { not: null }
      }
    });

    if (!squareItem) {
      console.log('❌ No Square items found. Please run product sync first.');
      return;
    }

    console.log(`📦 Testing with Square item: "${squareItem.name}"`);
    console.log(`   Original description: "${squareItem.description || 'None'}"`);

    // 2. Create an override for this item
    const testOverride = {
      itemId: squareItem.id,
      localDescription: '🌟 Premium locally-sourced ingredients with authentic Latin flavors. This enhanced description was added via the override system!',
      localDietaryOptions: ['Locally Sourced', 'Chef Recommended'],
      overrideDescription: true,
      overrideDietary: true,
      overrideImage: false,
      overrideServingSize: false
    };

    // Check if override already exists
    const existingOverride = await prisma.cateringItemOverrides.findUnique({
      where: { itemId: squareItem.id }
    });

    let override;
    if (existingOverride) {
      console.log('📝 Updating existing override...');
      override = await prisma.cateringItemOverrides.update({
        where: { itemId: squareItem.id },
        data: testOverride
      });
    } else {
      console.log('✨ Creating new override...');
      override = await prisma.cateringItemOverrides.create({
        data: testOverride
      });
    }

    console.log('✅ Override created/updated successfully!');

    // 3. Test the enhanced item fetching
    const enhancedItem = await prisma.cateringItem.findUnique({
      where: { id: squareItem.id },
      include: { overrides: true }
    });

    if (enhancedItem) {
      console.log('\n📊 Enhanced Item Details:');
      console.log(`   Name: ${enhancedItem.name} (Protected - Square item)`);
      console.log(`   Price: $${enhancedItem.price} (Protected - Square item)`);
      console.log(`   Description: ${enhancedItem.overrides?.localDescription || enhancedItem.description}`);
      console.log(`   Square Product ID: ${enhancedItem.squareProductId}`);
      console.log(`   Override Active: ${enhancedItem.overrides ? 'Yes' : 'No'}`);
      
      if (enhancedItem.overrides) {
        console.log('\n🔧 Override Controls:');
        console.log(`   Override Description: ${enhancedItem.overrides.overrideDescription}`);
        console.log(`   Override Image: ${enhancedItem.overrides.overrideImage}`);
        console.log(`   Override Dietary: ${enhancedItem.overrides.overrideDietary}`);
        console.log(`   Override Serving Size: ${enhancedItem.overrides.overrideServingSize}`);
        
        if (enhancedItem.overrides.localDietaryOptions.length > 0) {
          console.log(`   Local Dietary Options: ${enhancedItem.overrides.localDietaryOptions.join(', ')}`);
        }
      }
    }

    // 4. Test fetching all items with overrides
    const allItemsWithOverrides = await prisma.cateringItem.findMany({
      include: { overrides: true },
      take: 5
    });

    console.log('\n📋 Sample Items with Override Status:');
    allItemsWithOverrides.forEach(item => {
      const hasOverrides = !!item.overrides;
      const isSquareItem = !!item.squareProductId;
      console.log(`   ${item.name}: ${isSquareItem ? 'Square' : 'Local'} item ${hasOverrides ? 'WITH overrides' : 'without overrides'}`);
    });

    console.log('\n✨ Override system test completed successfully!');

  } catch (error) {
    console.error('❌ Override system test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOverrideSystem();
}

export { testOverrideSystem }; 