import { config } from 'dotenv';
import { PrismaClient, CateringItemCategory } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const localItems = [
  {
    name: 'Destino Special Paella',
    description: 'Our signature paella with saffron rice, fresh seafood, and locally-sourced vegetables. A true taste of Spain in San Francisco.',
    price: 18.50,
    category: CateringItemCategory.ENTREE,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    servingSize: '1 Person',
    imageUrl: '/images/catering/local/paella-special.jpg',
    isActive: true,
    squareCategory: null,
    squareProductId: null, // This makes it a local item
  },
  {
    name: 'Vegan Quinoa Power Bowl',
    description: 'Nutrient-packed bowl with organic quinoa, roasted vegetables, avocado, and our house-made tahini dressing. Perfect for health-conscious events.',
    price: 14.00,
    category: CateringItemCategory.ENTREE,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    servingSize: '1 Bowl',
    imageUrl: '/images/catering/local/quinoa-power-bowl.jpg',
    isActive: true,
    squareCategory: null,
    squareProductId: null,
  },
  {
    name: 'Artisanal Cheese & Charcuterie Board',
    description: 'Curated selection of local cheeses, cured meats, seasonal fruits, nuts, and artisanal crackers. Perfect for networking events.',
    price: 45.00,
    category: CateringItemCategory.STARTER,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    servingSize: 'Serves 8-10',
    imageUrl: '/images/catering/local/charcuterie-board.jpg',
    isActive: true,
    squareCategory: null,
    squareProductId: null,
  },
  {
    name: 'House-Made Tres Leches Cake',
    description: 'Traditional Latin American dessert made fresh daily. Light sponge cake soaked in three types of milk with cinnamon dusting.',
    price: 35.00,
    category: CateringItemCategory.DESSERT,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: 'Serves 12',
    imageUrl: '/images/catering/local/tres-leches.jpg',
    isActive: true,
    squareCategory: null,
    squareProductId: null,
  },
  {
    name: 'Seasonal Fruit & Herb Agua Fresca',
    description: 'Refreshing blend of seasonal fruits and fresh herbs. Made to order with filtered water and natural sweeteners.',
    price: 25.00,
    category: CateringItemCategory.BEVERAGE,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    servingSize: '1 Gallon',
    imageUrl: '/images/catering/local/agua-fresca.jpg',
    isActive: true,
    squareCategory: null,
    squareProductId: null,
  }
];

async function addLocalItems() {
  try {
    console.log('🏪 Adding Local Catering Items...');

    for (const item of localItems) {
      // Check if item already exists by name
      const existingItem = await prisma.cateringItem.findFirst({
        where: { name: item.name }
      });

      if (existingItem) {
        console.log(`⚠️ Item "${item.name}" already exists, skipping...`);
        continue;
      }

      const createdItem = await prisma.cateringItem.create({
        data: item
      });

      console.log(`✅ Created local item: "${createdItem.name}" - $${createdItem.price}`);
    }

    // Show summary
    const totalItems = await prisma.cateringItem.count();
    const squareItems = await prisma.cateringItem.count({
      where: { squareProductId: { not: null } }
    });
    const localItemsCount = totalItems - squareItems;

    console.log('\n📊 Catering Items Summary:');
    console.log(`   Total Items: ${totalItems}`);
    console.log(`   Square Items: ${squareItems}`);
    console.log(`   Local Items: ${localItemsCount}`);

    // Show items by category
    console.log('\n📋 Items by Category:');
    for (const category of Object.values(CateringItemCategory)) {
      const count = await prisma.cateringItem.count({
        where: { category }
      });
      if (count > 0) {
        console.log(`   ${category}: ${count} items`);
      }
    }

    console.log('\n✨ Local items added successfully!');

  } catch (error) {
    console.error('❌ Failed to add local items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addLocalItems();
}

export { addLocalItems }; 