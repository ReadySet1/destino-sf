/**
 * Update Delivery Zones Pricing (DES-52)
 *
 * Updates both catering and regular delivery zones with new pricing structure:
 *
 * Catering Zones:
 * - San Francisco: $50 delivery / $250 min
 * - Lower Peninsula: $65 delivery / $350 min
 * - South Bay: $75 delivery / $400 min
 * - East Bay: $75 delivery / $400 min
 * - Marin County: $65 delivery / $400 min
 *
 * Regular Product Zones:
 * - San Francisco: $25 delivery / $0 min
 * - Lower Peninsula: $35 delivery / $25 min
 * - South Bay: $65 delivery / $50 min
 * - East Bay: $35 delivery / $25 min
 * - Marin County: $65 delivery / $25 min
 */

import { prisma } from '../src/lib/db-unified';

async function updateDeliveryZones() {
  console.log('🚀 Starting delivery zones pricing update (DES-52)...\n');

  try {
    // Update Catering Delivery Zones
    console.log('📦 Updating Catering Delivery Zones...');

    // San Francisco - $50 delivery / $250 min
    await prisma.cateringDeliveryZone.updateMany({
      where: { zone: 'san_francisco' },
      data: {
        deliveryFee: 50,
        minimumAmount: 250,
      },
    });
    console.log('  ✅ San Francisco: $50 delivery / $250 min');

    // Lower Peninsula - $65 delivery / $350 min
    await prisma.cateringDeliveryZone.updateMany({
      where: { zone: 'lower_peninsula' },
      data: {
        deliveryFee: 65,
        minimumAmount: 350,
      },
    });
    console.log('  ✅ Lower Peninsula: $65 delivery / $350 min');

    // South Bay - $75 delivery / $400 min
    await prisma.cateringDeliveryZone.updateMany({
      where: { zone: 'south_bay' },
      data: {
        deliveryFee: 75,
        minimumAmount: 400,
      },
    });
    console.log('  ✅ South Bay: $75 delivery / $400 min');

    // Create/Update East Bay zone for catering
    const existingEastBay = await prisma.cateringDeliveryZone.findUnique({
      where: { zone: 'east_bay' },
    });

    if (existingEastBay) {
      await prisma.cateringDeliveryZone.update({
        where: { zone: 'east_bay' },
        data: {
          deliveryFee: 75,
          minimumAmount: 400,
          active: true,
        },
      });
      console.log('  ✅ East Bay: $75 delivery / $400 min (updated)');
    } else {
      await prisma.cateringDeliveryZone.create({
        data: {
          zone: 'east_bay',
          name: 'East Bay',
          description: 'Oakland, Berkeley, and surrounding East Bay cities',
          deliveryFee: 75,
          minimumAmount: 400,
          estimatedDeliveryTime: '2-3 hours',
          postalCodes: [
            '94601', '94602', '94603', '94605', '94606', '94607', '94608', '94609',
            '94610', '94611', '94612', '94618', '94619', '94621', '94702', '94703',
            '94704', '94705', '94706', '94707', '94708', '94709', '94710', '94720',
          ],
          cities: [
            'Oakland', 'Berkeley', 'Alameda', 'Emeryville', 'Piedmont',
          ],
          displayOrder: 4,
          active: true,
        },
      });
      console.log('  ✅ East Bay: $75 delivery / $400 min (created)');
    }

    // Create/Update Marin County zone for catering
    const existingMarin = await prisma.cateringDeliveryZone.findUnique({
      where: { zone: 'marin_county' },
    });

    if (existingMarin) {
      await prisma.cateringDeliveryZone.update({
        where: { zone: 'marin_county' },
        data: {
          deliveryFee: 65,
          minimumAmount: 400,
          active: true,
        },
      });
      console.log('  ✅ Marin County: $65 delivery / $400 min (updated)');
    } else {
      await prisma.cateringDeliveryZone.create({
        data: {
          zone: 'marin_county',
          name: 'Marin County',
          description: 'Marin County and surrounding areas',
          deliveryFee: 65,
          minimumAmount: 400,
          estimatedDeliveryTime: '2-3 hours',
          postalCodes: [
            '94901', '94903', '94904', '94913', '94914', '94915', '94920', '94924',
            '94925', '94930', '94933', '94939', '94940', '94941', '94945', '94949',
          ],
          cities: [
            'San Rafael', 'Novato', 'Mill Valley', 'Tiburon', 'Sausalito',
            'Corte Madera', 'Larkspur', 'San Anselmo',
          ],
          displayOrder: 5,
          active: true,
        },
      });
      console.log('  ✅ Marin County: $65 delivery / $400 min (created)');
    }

    // Deactivate old Peninsula zone (replaced by East Bay and Marin)
    await prisma.cateringDeliveryZone.updateMany({
      where: { zone: 'peninsula' },
      data: { active: false },
    });
    console.log('  ℹ️  Deactivated old Peninsula zone\n');

    // Update Regular Delivery Zones
    console.log('🛒 Updating Regular Delivery Zones...');

    // San Francisco - $25 delivery / $0 min
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'SF_CORE' },
      data: {
        deliveryFee: 25,
        minimumOrderForFree: 0,
      },
    });
    console.log('  ✅ San Francisco: $25 delivery / $0 min');

    // Lower Peninsula - $35 delivery / $25 min
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'PENINSULA_EXTENDED' },
      data: {
        deliveryFee: 35,
        minimumOrderForFree: 25,
      },
    });
    console.log('  ✅ Lower Peninsula: $35 delivery / $25 min');

    // South Bay - $65 delivery / $50 min
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'PENINSULA_SOUTH' },
      data: {
        deliveryFee: 65,
        minimumOrderForFree: 50,
      },
    });
    console.log('  ✅ South Bay: $65 delivery / $50 min');

    // East Bay - $35 delivery / $25 min
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'EAST_BAY' },
      data: {
        deliveryFee: 35,
        minimumOrderForFree: 25,
      },
    });
    console.log('  ✅ East Bay: $35 delivery / $25 min');

    // Marin County (North Bay) - $65 delivery / $25 min
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'NORTH_BAY' },
      data: {
        deliveryFee: 65,
        minimumOrderForFree: 25,
      },
    });
    console.log('  ✅ Marin County: $65 delivery / $25 min');

    // Deactivate SF_EXTENDED zone (merged into other zones)
    await prisma.regularDeliveryZone.updateMany({
      where: { zone: 'SF_EXTENDED' },
      data: { active: false },
    });
    console.log('  ℹ️  Deactivated SF_EXTENDED zone\n');

    // Verify updates
    console.log('🔍 Verifying updates...');
    const cateringZones = await prisma.cateringDeliveryZone.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      select: { zone: true, name: true, deliveryFee: true, minimumAmount: true },
    });

    console.log('\n📦 Active Catering Zones:');
    cateringZones.forEach((zone) => {
      console.log(
        `  ${zone.name}: $${zone.deliveryFee} delivery / $${zone.minimumAmount} min`
      );
    });

    const regularZones = await prisma.regularDeliveryZone.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      select: { zone: true, name: true, deliveryFee: true, minimumOrderForFree: true },
    });

    console.log('\n🛒 Active Regular Zones:');
    regularZones.forEach((zone) => {
      console.log(
        `  ${zone.name}: $${zone.deliveryFee} delivery / $${zone.minimumOrderForFree} min`
      );
    });

    console.log('\n✅ Delivery zones pricing update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating delivery zones:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateDeliveryZones()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
