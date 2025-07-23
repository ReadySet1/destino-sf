import { prisma } from '@/lib/db';

async function seedShippingConfiguration() {
  console.log('🌱 Seeding shipping configuration...');

  const configurations = [
    {
      productName: 'alfajores',
      baseWeightLb: 0.5,
      weightPerUnitLb: 0.4,
      isActive: true,
      applicableForNationwideOnly: true,
    },
    {
      productName: 'empanadas',
      baseWeightLb: 1.0,
      weightPerUnitLb: 0.8,
      isActive: true,
      applicableForNationwideOnly: true,
    },
  ];

  for (const config of configurations) {
    try {
      const result = await prisma.shippingConfiguration.upsert({
        where: { productName: config.productName },
        create: config,
        update: config,
      });
      console.log(`✅ Created/updated shipping config for ${result.productName}`);
    } catch (error) {
      console.error(`❌ Failed to create/update shipping config for ${config.productName}:`, error);
    }
  }

  console.log('✨ Shipping configuration seeding completed!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedShippingConfiguration()
    .catch(error => {
      console.error('❌ Error seeding shipping configuration:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedShippingConfiguration };
