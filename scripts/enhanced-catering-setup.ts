#!/usr/bin/env tsx

/**
 * Enhanced Catering Setup Script with Intelligent Image Assignment
 * 
 * This script sets up the 2025 catering menu with smart image handling:
 * 1. First tries to find matching Square items and uses their S3 images
 * 2. Falls back to local images if no Square item exists
 * 3. Preserves existing images during updates
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Enhanced appetizer items with intelligent image assignment
const APPETIZER_ITEMS = [
  {
    name: 'Pintxos Vegetarianos',
    description: 'roasted beets / cucumber / kalamata olives / feta',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Arepas',
    description: 'cornmeal biscuits / ginger / pineapple-cilantro salsa',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Camotitos',
    description: 'sweet potato / coconut milk / shiitake / multi-grain cracker / poppyseeds',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Mt. Tam Montado',
    description: "cowgirl creamery's mt. tam / pilea de aji / crostini",
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Quinoa Arancini Balls',
    description: 'white quinoa / mozzarella / shiitake / romesco',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Causa',
    description: 'yukon potato / lime / sweet 100 tomato / olive puree / black sesame cracker',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Bocadillo de Boquerones',
    description: 'almond picada / white bean puree / spanish boquerones / sesame cracker',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Peruvian Ceviche',
    description: 'wild halibut / aji amarillo / cilantro / lime / corn nuts / endive',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Tiger Prawns',
    description: 'sautéed prawns / corn-goat cheese crème / corn tortilla chips',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Salmon Carpaccio',
    description: 'local wild king salmon / ginger / creamy pepper reduction / poppyseed',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Churrasco',
    description: 'top sirloin strips / chimichurri / plantain chips',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Pan con Tomate',
    description: '16-month aged jamon serrano / garlic / tomato spread / crostini',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Anticuchos de Pollo',
    description: 'free range chicken breast skewers / smoky pepper marinade',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Sliders',
    description: 'angus beef mini-burgers / smoky aji panca pepper / pickled onion relish',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Albondigas',
    description: 'baked pork meatballs / caribbean-10 spice rub / mango reduction',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Oxtail',
    description: 'braised oxtail / pine nuts / golden raisins / mint / queso cotija / plantain crisps',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Empanada - Pork',
    description: 'adobo rubbed pork / corn-goat cheese crème / corn tortilla chips',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- EMPANADAS',
  },
  {
    name: 'Empanada - Vegetarian',
    description: 'hearts of palms / white cheddar / cilantro / grana padano parmesan',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- EMPANADAS',
  },
  {
    name: 'Tamal Verde',
    description: 'sweet white corn / cilantro / aji amarillo / red bell pepper',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS',
  },
  {
    name: 'Empanada - Beef',
    description: 'slow-cooked beef / olive / hard boiled egg / raisins',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- EMPANADAS',
  },
  {
    name: 'Empanada - Chicken',
    description: 'free-range chicken breast / cream-aji chile reduction / parmesan',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- EMPANADAS',
  },
  {
    name: 'Empanada - Salmon',
    description: 'wild king salmon / cream-aji chile reduction / parmesan',
    price: 0.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- EMPANADAS',
  },
];

// Platter items with enhanced descriptions
const PLATTER_ITEMS = [
  {
    name: 'Plantain Chips Platter - Small',
    description: 'Crispy plantain chips with aji amarillo dipping sauce (serves 8-12)',
    price: 45.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
  {
    name: 'Plantain Chips Platter - Large',
    description: 'Crispy plantain chips with aji amarillo dipping sauce (serves 15-20)',
    price: 80.0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
  {
    name: 'Cheese & Charcuterie Platter - Small',
    description: 'Selection of artisanal cheeses and cured meats with accompaniments (serves 8-12)',
    price: 150.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
  {
    name: 'Cheese & Charcuterie Platter - Large',
    description: 'Selection of artisanal cheeses and cured meats with accompaniments (serves 15-20)',
    price: 280.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
  {
    name: 'Cocktail Prawn Platter - Small',
    description: 'Fresh prawns with cocktail sauce and lemon (serves 8-12)',
    price: 80.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
  {
    name: 'Cocktail Prawn Platter - Large',
    description: 'Fresh prawns with cocktail sauce and lemon (serves 15-20)',
    price: 150.0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS',
  },
];

// Dessert items
const DESSERT_ITEMS = [
  {
    name: 'Alfajores - Classic',
    description: 'Traditional dulce de leche sandwich cookies',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Alfajores - Chocolate',
    description: 'Chocolate dulce de leche sandwich cookies',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Alfajores - Lemon',
    description: 'Lemon dulce de leche sandwich cookies',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Alfajores - Gluten-Free',
    description: 'Gluten-free dulce de leche sandwich cookies',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Mini Cupcakes',
    description: 'Assorted mini cupcakes with buttercream frosting',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Lemon Bars',
    description: 'Tart lemon bars with powdered sugar',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
  {
    name: 'Brownie Bites',
    description: 'Rich chocolate brownie bites',
    price: 2.5,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS',
  },
];

// Appetizer packages
const APPETIZER_PACKAGES = [
  {
    name: 'Appetizer Selection - 5 Items',
    description: 'Selection of 5 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 22.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-5.jpg',
    dietaryOptions: ['Customizable for all dietary needs'],
  },
  {
    name: 'Appetizer Selection - 7 Items',
    description: 'Selection of 7 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 34.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-7.jpg',
    dietaryOptions: ['Customizable for all dietary needs'],
  },
  {
    name: 'Appetizer Selection - 9 Items',
    description: 'Selection of 9 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 46.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-9.jpg',
    dietaryOptions: ['Customizable for all dietary needs'],
  },
];

/**
 * Intelligent image assignment function
 * Tries to find matching Square items and uses their S3 images
 * Falls back to local images if no match is found
 */
async function getIntelligentImageUrl(itemName: string): Promise<string | null> {
  try {
    // Get all SIDE items with S3 images for matching
    const sideItems = await prisma.cateringItem.findMany({
      where: {
        category: 'SIDE',
        isActive: true,
        imageUrl: { contains: 's3' }
      },
      select: { name: true, imageUrl: true }
    });

    const cleanItemName = itemName.toLowerCase().trim();
    
    // Try exact match first
    let matchingSideItem = sideItems.find(item => 
      item.name.toLowerCase().trim() === cleanItemName
    );
    
    // Try fuzzy matching if no exact match
    if (!matchingSideItem) {
      // Remove common prefixes and try again
      const cleanName = cleanItemName
        .replace(/^(empanada - |pan con |)/g, '')
        .replace(/(s)$/g, ''); // remove plural 's'
      
      matchingSideItem = sideItems.find(item => 
        item.name.toLowerCase().includes(cleanName) || 
        cleanName.includes(item.name.toLowerCase())
      );
    }

    if (matchingSideItem && matchingSideItem.imageUrl) {
      console.log(`  🎯 Found Square image for ${itemName}: ${matchingSideItem.name}`);
      return matchingSideItem.imageUrl;
    }

    // Fall back to local images based on category and type
    if (itemName.includes('Empanada')) {
      return '/images/catering/appetizer-selection.jpg';
    } else if (itemName.includes('Platter')) {
      return '/images/catering/default-appetizer.jpg';
    } else if (itemName.includes('Alfajores') || itemName.includes('Brownie') || itemName.includes('Lemon') || itemName.includes('Cupcake')) {
      return '/images/catering/default-item.jpg';
    } else {
      return '/images/catering/appetizer-selection.jpg';
    }

  } catch (error) {
    console.error(`  ⚠️  Error getting image for ${itemName}:`, error);
    return '/images/catering/default-item.jpg';
  }
}

async function setupEnhancedCateringMenu() {
  console.log('🚀 Setting up Enhanced 2025 Catering Menu...');
  
  let createdItems = 0;
  let updatedItems = 0;
  let createdPackages = 0;
  let updatedPackages = 0;

  try {
    // Create appetizer items with intelligent image assignment
    console.log('📝 Creating appetizer items with intelligent image assignment...');
    for (const item of APPETIZER_ITEMS) {
      const existingItem = await prisma.cateringItem.findFirst({
        where: { name: item.name },
      });

      // Get intelligent image URL
      const imageUrl = await getIntelligentImageUrl(item.name);

      if (existingItem) {
        // Only update image if the existing item doesn't have an S3 image
        const shouldUpdateImage = !existingItem.imageUrl?.includes('s3');
        
        await prisma.cateringItem.update({
          where: { id: existingItem.id },
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl: shouldUpdateImage ? imageUrl : existingItem.imageUrl,
            updatedAt: new Date(),
          },
        });
        updatedItems++;
        console.log(`  ✅ Updated: ${item.name} ${shouldUpdateImage ? '(with image)' : '(preserved existing image)'}`);
      } else {
        await prisma.cateringItem.create({
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl,
            isActive: true,
          },
        });
        createdItems++;
        console.log(`  🆕 Created: ${item.name} (with ${imageUrl?.includes('s3') ? 'S3' : 'local'} image)`);
      }
    }

    // Create platter items
    console.log('📝 Creating platter items...');
    for (const item of PLATTER_ITEMS) {
      const existingItem = await prisma.cateringItem.findFirst({
        where: { name: item.name },
      });

      const imageUrl = await getIntelligentImageUrl(item.name);

      if (existingItem) {
        const shouldUpdateImage = !existingItem.imageUrl?.includes('s3');
        
        await prisma.cateringItem.update({
          where: { id: existingItem.id },
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl: shouldUpdateImage ? imageUrl : existingItem.imageUrl,
            updatedAt: new Date(),
          },
        });
        updatedItems++;
        console.log(`  ✅ Updated: ${item.name}`);
      } else {
        await prisma.cateringItem.create({
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl,
            isActive: true,
          },
        });
        createdItems++;
        console.log(`  🆕 Created: ${item.name}`);
      }
    }

    // Create dessert items
    console.log('📝 Creating dessert items...');
    for (const item of DESSERT_ITEMS) {
      const existingItem = await prisma.cateringItem.findFirst({
        where: { name: item.name },
      });

      const imageUrl = await getIntelligentImageUrl(item.name);

      if (existingItem) {
        const shouldUpdateImage = !existingItem.imageUrl?.includes('s3');
        
        await prisma.cateringItem.update({
          where: { id: existingItem.id },
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl: shouldUpdateImage ? imageUrl : existingItem.imageUrl,
            updatedAt: new Date(),
          },
        });
        updatedItems++;
        console.log(`  ✅ Updated: ${item.name}`);
      } else {
        await prisma.cateringItem.create({
          data: {
            ...item,
            price: new Decimal(item.price),
            category: item.category as any,
            imageUrl,
            isActive: true,
          },
        });
        createdItems++;
        console.log(`  🆕 Created: ${item.name}`);
      }
    }

    // Create appetizer packages
    console.log('📦 Creating appetizer packages...');
    for (const pkg of APPETIZER_PACKAGES) {
      const existingPackage = await prisma.cateringPackage.findFirst({
        where: { name: pkg.name },
      });

      if (existingPackage) {
        await prisma.cateringPackage.update({
          where: { id: existingPackage.id },
          data: {
            ...pkg,
            pricePerPerson: new Decimal(pkg.pricePerPerson),
            type: pkg.type as any,
            updatedAt: new Date(),
          },
        });
        updatedPackages++;
        console.log(`  ✅ Updated package: ${pkg.name}`);
      } else {
        await prisma.cateringPackage.create({
          data: {
            ...pkg,
            pricePerPerson: new Decimal(pkg.pricePerPerson),
            type: pkg.type as any,
            isActive: true,
          },
        });
        createdPackages++;
        console.log(`  🆕 Created package: ${pkg.name}`);
      }
    }

    // Update Store Settings for catering minimum
    console.log('⚙️ Updating store settings...');
    const existingSettings = await prisma.storeSettings.findFirst();
    
    if (existingSettings) {
      await prisma.storeSettings.update({
        where: { id: existingSettings.id },
        data: {
          cateringMinimumAmount: new Decimal(100.0), // Minimum catering order amount
          updatedAt: new Date(),
        },
      });
      console.log('  ✅ Updated store settings');
    } else {
      await prisma.storeSettings.create({
        data: {
          cateringMinimumAmount: new Decimal(100.0),
        },
      });
      console.log('  ✅ Created store settings');
    }

    console.log('\n🎉 Enhanced Setup Complete!');
    console.log(`📊 Summary:`);
    console.log(`   • Appetizer Items: ${createdItems} created, ${updatedItems} updated`);
    console.log(`   • Packages: ${createdPackages} created, ${updatedPackages} updated`);
    console.log(`   • Business Rules: $100 minimum catering order implemented`);
    console.log(`   • Image Strategy: Intelligent assignment with Square S3 priority`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setupEnhancedCateringMenu()
  .then(() => {
    console.log('\n✨ Enhanced catering menu setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup script failed:', error);
    process.exit(1);
  });