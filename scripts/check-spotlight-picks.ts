import { prisma } from '../src/lib/db';

async function checkSpotlightPicks() {
  try {
    console.log('🔍 Checking current spotlight picks...\n');
    
    const picks = await prisma.spotlightPick.findMany({
      orderBy: { position: 'asc' },
      include: { product: true }
    });

    picks.forEach(pick => {
      console.log(`Position ${pick.position}:`);
      console.log(`  Title: ${pick.customTitle || pick.product?.name || 'Empty'}`);
      console.log(`  Is Custom: ${pick.isCustom}`);
      console.log(`  Is Active: ${pick.isActive}`);
      if (pick.customImageUrl) {
        console.log(`  Image: ${pick.customImageUrl}`);
      }
      if (pick.product) {
        console.log(`  Product: ${pick.product.name}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpotlightPicks(); 