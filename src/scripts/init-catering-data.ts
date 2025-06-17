import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeCateringData() {
  console.log('🚀 Initializing catering data...');

  try {
    // Create sample catering items
    const items = await Promise.all([
      prisma.cateringItem.create({
        data: {
          name: 'Classic Empanadas',
          description: 'Traditional Argentine empanadas with beef and onions',
          price: 3.50,
          category: 'STARTER',
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          servingSize: '1 piece',
          isActive: true,
        },
      }),
      prisma.cateringItem.create({
        data: {
          name: 'Vegetarian Empanadas',
          description: 'Delicious empanadas filled with spinach and cheese',
          price: 3.50,
          category: 'STARTER',
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          servingSize: '1 piece',
          isActive: true,
        },
      }),
      prisma.cateringItem.create({
        data: {
          name: 'Quinoa Salad',
          description: 'Fresh quinoa salad with vegetables and herbs',
          price: 8.00,
          category: 'SALAD',
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          servingSize: '1 portion',
          isActive: true,
        },
      }),
      prisma.cateringItem.create({
        data: {
          name: 'Alfajores',
          description: 'Traditional Argentine cookies with dulce de leche',
          price: 2.50,
          category: 'DESSERT',
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          servingSize: '1 piece',
          isActive: true,
        },
      }),
    ]);

    console.log(`✅ Created ${items.length} catering items`);

    // Create sample catering packages
    const packages = await Promise.all([
      prisma.cateringPackage.create({
        data: {
          name: 'Appetizer Package',
          description: 'Perfect for cocktail hours and networking events',
          minPeople: 10,
          pricePerPerson: 12.00,
          type: 'INDIVIDUAL',
          isActive: true,
          featuredOrder: 1,
          dietaryOptions: ['Vegetarian Options Available'],
        },
      }),
      prisma.cateringPackage.create({
        data: {
          name: 'Boxed Lunch Package',
          description: 'Individual boxed lunches perfect for corporate events',
          minPeople: 5,
          pricePerPerson: 18.00,
          type: 'BOXED_LUNCH',
          isActive: true,
          featuredOrder: 2,
          dietaryOptions: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        },
      }),
    ]);

    console.log(`✅ Created ${packages.length} catering packages`);

    console.log('🎉 Catering data initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing catering data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  initializeCateringData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { initializeCateringData }; 