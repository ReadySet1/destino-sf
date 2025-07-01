import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin accounts
  const adminAccounts = [
    {
      id: randomUUID(),
      email: 'emmanuel@alanis.dev',
      name: 'Emmanuel Alanis',
      role: 'ADMIN' as const,
    },
    {
      id: randomUUID(),
      email: 'james@destinosf.com',
      name: 'James - Destino SF',
      role: 'ADMIN' as const,
    },
  ];

  for (const account of adminAccounts) {
    try {
      // Check if admin already exists
      const existingAdmin = await prisma.profile.findUnique({
        where: { email: account.email },
      });

      if (existingAdmin) {
        console.log(`✅ Admin ${account.email} already exists`);
        
        // Update role to ADMIN if not already
        if (existingAdmin.role !== 'ADMIN') {
          await prisma.profile.update({
            where: { email: account.email },
            data: { role: 'ADMIN' },
          });
          console.log(`🔄 Updated ${account.email} role to ADMIN`);
        }
      } else {
        // Create new admin
        const newAdmin = await prisma.profile.create({
          data: {
            id: account.id,
            email: account.email,
            name: account.name,
            role: account.role,
          },
        });
        console.log(`✨ Created admin: ${newAdmin.email} (${newAdmin.id})`);
      }
    } catch (error) {
      console.error(`❌ Error processing admin ${account.email}:`, error);
    }
  }

  // Optional: Create default store settings if they don't exist
  try {
    const existingSettings = await prisma.storeSettings.findFirst();
    
    if (!existingSettings) {
      await prisma.storeSettings.create({
        data: {
          name: 'Destino SF',
          address: 'San Francisco, CA',
          phone: '(415) 123-4567',
          email: 'hello@destinosf.com',
          taxRate: 8.25,
          minAdvanceHours: 2,
          minOrderAmount: 0,
          maxDaysInAdvance: 7,
          isStoreOpen: true,
          cateringMinimumAmount: 350,
        },
      });
      console.log('✨ Created default store settings');
    } else {
      console.log('✅ Store settings already exist');
    }
  } catch (error) {
    console.error('❌ Error creating store settings:', error);
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 