/**
 * Update store settings to add catering minimum amount
 * 
 * Run with: node scripts/update-store-settings.js
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function updateStoreSettings() {
  try {
    console.log('Starting store settings update...');
    
    // Find the existing store settings
    const existingSettings = await prisma.storeSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    
    if (existingSettings) {
      console.log('Found existing store settings. Updating...');
      
      // Update with new field
      await prisma.storeSettings.update({
        where: { id: existingSettings.id },
        data: {
          cateringMinimumAmount: 150.00, // Default to $150 minimum for catering orders
        },
      });
      
      console.log('Store settings updated successfully!');
    } else {
      console.log('No existing store settings found. Creating new settings...');
      
      // Create new settings
      await prisma.storeSettings.create({
        data: {
          name: 'Destino SF',
          taxRate: 8.25,
          minAdvanceHours: 2,
          minOrderAmount: 0,
          cateringMinimumAmount: 150.00, // Default to $150 minimum for catering orders
          maxDaysInAdvance: 7,
          isStoreOpen: true,
        },
      });
      
      console.log('New store settings created successfully!');
    }
  } catch (error) {
    console.error('Error updating store settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateStoreSettings()
  .then(() => console.log('Script completed.'))
  .catch((error) => console.error('Script error:', error)); 