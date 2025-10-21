/**
 * Fix Regular Delivery Zones Naming (DES-52 follow-up)
 *
 * Updates zone names to match requirements exactly:
 * - San Francisco (SF_CORE)
 * - Lower Peninsula (PENINSULA_EXTENDED renamed)
 * - South Bay (PENINSULA_SOUTH renamed)
 * - East Bay (EAST_BAY)
 * - Marin County (NORTH_BAY renamed)
 */

import { prisma } from '../src/lib/db-unified';

async function fixRegularZones() {
  console.log('🔧 Fixing Regular Delivery Zone Names (DES-52)...\n');

  try {
    // 1. Update Peninsula Extended → Lower Peninsula
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'PENINSULA_EXTENDED' },
      data: {
        name: 'Lower Peninsula',
        description: 'Lower Peninsula including San Mateo, Redwood City, Palo Alto, Mountain View',
        displayOrder: 2,
      },
    });
    console.log('  ✅ Updated PENINSULA_EXTENDED → Lower Peninsula');

    // 2. Update Peninsula & South Bay → South Bay
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'PENINSULA_SOUTH' },
      data: {
        name: 'South Bay',
        description: 'South Bay including San Jose, Santa Clara, Sunnyvale, Cupertino',
        displayOrder: 3,
      },
    });
    console.log('  ✅ Updated PENINSULA_SOUTH → South Bay');

    // 3. Update North Bay → Marin County
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'NORTH_BAY' },
      data: {
        name: 'Marin County',
        description: 'Marin County and Napa Valley areas',
        displayOrder: 5,
      },
    });
    console.log('  ✅ Updated NORTH_BAY → Marin County');

    // 4. Update San Francisco Core → San Francisco
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'SF_CORE' },
      data: {
        name: 'San Francisco',
        description: 'Central San Francisco neighborhoods',
        displayOrder: 1,
      },
    });
    console.log('  ✅ Updated SF_CORE → San Francisco');

    // 5. Update East Bay display order
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'EAST_BAY' },
      data: {
        displayOrder: 4,
      },
    });
    console.log('  ✅ Updated East Bay display order');

    // Verify updates
    console.log('\n🔍 Verifying updates...\n');
    const zones = await prisma.regularDeliveryZone.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      select: { zone: true, name: true, deliveryFee: true, minimumOrderForFree: true, displayOrder: true },
    });

    console.log('📋 Active Regular Delivery Zones:');
    zones.forEach((zone, index) => {
      console.log(
        `  ${index + 1}. ${zone.name}: $${zone.deliveryFee} delivery / $${zone.minimumOrderForFree} min`
      );
    });

    console.log('\n✅ Regular delivery zone names updated successfully!');
  } catch (error) {
    console.error('❌ Error updating regular zones:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
fixRegularZones()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
