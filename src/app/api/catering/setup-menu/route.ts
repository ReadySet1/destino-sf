import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Define the appetizer items from the 2025 menu
const APPETIZER_ITEMS = [
  {
    name: 'Pintxos Vegetarianos',
    description: 'roasted beets / cucumber / kalamata olives / feta',
    price: 0, // Price determined by package selection
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Arepas',
    description: 'cornmeal biscuits / ginger / pineapple-cilantro salsa',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Camotitos',
    description: 'sweet potato / coconut milk / shitake / multi-grain cracker / poppyseeds',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Mt. Tam Montado',
    description: 'cowgirl creamery\'s mt. tam / jalea de aji / crostini',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Quinoa Arancini Balls',
    description: 'white quinoa / mozzarella / shitake / romesco',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Causa',
    description: 'yukon potato / lime / sweet 100 tomato / olive puree / black sesame cracker',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Bocadillo de Boquerones',
    description: 'almond picada / white bean puree / spanish boquerones / sesame cracker',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Peruvian Ceviche',
    description: 'wild halibut / aji amarillo / cilantro / lime / corn nuts / endive',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Tiger Prawns',
    description: 'sautéed prawns / corn-goat cheese crème / corn tortilla chips',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Salmon Carpaccio',
    description: 'local wild king salmon / ginger / creamy pepper reduction / poppyseed',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Churrasco',
    description: 'top sirloin strips / chimichurri / plantain chips',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Pan con Tomate',
    description: '16-month aged jamon serrano / garlic / tomato spread / crostini',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Anticuchos de Pollo',
    description: 'free range chicken breast skewers / smoky pepper marinade',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Sliders',
    description: 'angus beef mini-burgers / smoky aji panca pepper / pickled onion relish',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Albondigas',
    description: 'baked pork meatballs / caribbean-10 spice rub / mango reduction',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Oxtail',
    description: 'braised oxtail / pine nuts / golden raisins / mint / queso cotija / plantain crisps',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Empanada - Pork',
    description: 'ground hampshire pork / manzanilla olives / black mission figs / caribbean spices',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Empanada - Vegetarian',
    description: 'hearts of palms / white cheddar / cilantro / grana padano parmesan',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Tamal Verde',
    description: 'sweet white corn / cilantro / aji amarillo / red bell pepper',
    price: 0,
    category: 'STARTER',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Empanada - Beef',
    description: 'ground beef / golden raisins / pimiento stuffed olives / egg / pimento',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Empanada - Chicken',
    description: 'free-range chicken breast / cream–aji chile reduction / parmesan',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  },
  {
    name: 'Empanada - Salmon',
    description: 'local king salmon / tamarind – panela reduction',
    price: 0,
    category: 'STARTER',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- APPETIZERS'
  }
];

// Define the platter items with specific pricing
const PLATTER_ITEMS = [
  {
    name: 'Plantain Chips Platter - Small',
    description: 'yellow pepper cream sauce (approximately 10-20 people)',
    price: 45.00,
    category: 'STARTER',
    servingSize: '10-20 people',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS'
  },
  {
    name: 'Plantain Chips Platter - Large',
    description: 'yellow pepper cream sauce (approximately 25-40 people)',
    price: 80.00,
    category: 'STARTER',
    servingSize: '25-40 people',
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS'
  },
  {
    name: 'Cheese & Charcuterie Platter - Small',
    description: 'selection of local & imported artisan - 8oz portions of 4 offerings (approximately 10-20 people)',
    price: 150.00,
    category: 'STARTER',
    servingSize: '10-20 people',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- SHARE PLATTERS'
  },
  {
    name: 'Cheese & Charcuterie Platter - Large',
    description: 'selection of local & imported artisan - 8oz portions of 6 offerings (approximately 25-40 people)',
    price: 280.00,
    category: 'STARTER',
    servingSize: '25-40 people',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- SHARE PLATTERS'
  },
  {
    name: 'Cocktail Prawn Platter - Small',
    description: 'jumbo tiger prawns / zesty cocktail sauce - 25 prawns (approximately 10-20 people)',
    price: 80.00,
    category: 'STARTER',
    servingSize: '10-20 people',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS'
  },
  {
    name: 'Cocktail Prawn Platter - Large',
    description: 'jumbo tiger prawns / zesty cocktail sauce - 50 prawns (approximately 25-40 people)',
    price: 150.00,
    category: 'STARTER',
    servingSize: '25-40 people',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- SHARE PLATTERS'
  }
];

// Define dessert items
const DESSERT_ITEMS = [
  {
    name: 'Alfajores - Classic',
    description: 'south american butter cookies: shortbread / dulce de leche',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Alfajores - Chocolate',
    description: 'dulce de leche / dark chocolate / peruvian sea salt',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Alfajores - Lemon',
    description: 'shortbread / dulce de leche / lemon royal icing',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Alfajores - Gluten-Free',
    description: 'gluten-free dulce de leche butter cookies',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Mini Cupcakes',
    description: 'selection of dark chocolate or vanilla buttercream',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Lemon Bars',
    description: 'meyer lemon zest, blueberry compote',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  },
  {
    name: 'Brownie Bites',
    description: 'double dark chocolate brownie, candied hot pepper jelly',
    price: 2.50,
    category: 'DESSERT',
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    squareCategory: 'CATERING- DESSERTS'
  }
];

// Define the appetizer packages
const APPETIZER_PACKAGES = [
  {
    name: 'Appetizer Selection - 5 Items',
    description: 'Selection of 5 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 22.00,
    type: 'INDIVIDUAL',
    imageUrl: null,
    dietaryOptions: ['Customizable for all dietary needs']
  },
  {
    name: 'Appetizer Selection - 7 Items',
    description: 'Selection of 7 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 34.00,
    type: 'INDIVIDUAL',
    imageUrl: null,
    dietaryOptions: ['Customizable for all dietary needs']
  },
  {
    name: 'Appetizer Selection - 9 Items',
    description: 'Selection of 9 appetizer items from our 2025 menu',
    minPeople: 2,
    pricePerPerson: 46.00,
    type: 'INDIVIDUAL',
    imageUrl: null,
    dietaryOptions: ['Customizable for all dietary needs']
  }
];

/**
 * POST /api/catering/setup-menu
 * 
 * Restores the 2025 catering menu including appetizer packages and items.
 * This endpoint is called after Square sync to ensure all catering data is properly restored.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up 2025 Catering Menu via API...');

    let createdItems = 0;
    let updatedItems = 0;
    let createdPackages = 0;
    let updatedPackages = 0;
    const errors: string[] = [];

    // Create appetizer items
    console.log('📝 Creating appetizer items...');
    for (const item of APPETIZER_ITEMS) {
      try {
        const existingItem = await prisma.cateringItem.findFirst({
          where: { name: item.name }
        });

        if (existingItem) {
          await prisma.cateringItem.update({
            where: { id: existingItem.id },
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              updatedAt: new Date()
            }
          });
          updatedItems++;
          console.log(`  ✅ Updated: ${item.name}`);
        } else {
          await prisma.cateringItem.create({
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              isActive: true
            }
          });
          createdItems++;
          console.log(`  🆕 Created: ${item.name}`);
        }
      } catch (error) {
        const errorMsg = `Failed to process item ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Create platter items
    console.log('📝 Creating platter items...');
    for (const item of PLATTER_ITEMS) {
      try {
        const existingItem = await prisma.cateringItem.findFirst({
          where: { name: item.name }
        });

        if (existingItem) {
          await prisma.cateringItem.update({
            where: { id: existingItem.id },
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              updatedAt: new Date()
            }
          });
          updatedItems++;
          console.log(`  ✅ Updated: ${item.name}`);
        } else {
          await prisma.cateringItem.create({
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              isActive: true
            }
          });
          createdItems++;
          console.log(`  🆕 Created: ${item.name}`);
        }
      } catch (error) {
        const errorMsg = `Failed to process platter ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Create dessert items
    console.log('📝 Creating dessert items...');
    for (const item of DESSERT_ITEMS) {
      try {
        const existingItem = await prisma.cateringItem.findFirst({
          where: { name: item.name }
        });

        if (existingItem) {
          await prisma.cateringItem.update({
            where: { id: existingItem.id },
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              updatedAt: new Date()
            }
          });
          updatedItems++;
          console.log(`  ✅ Updated: ${item.name}`);
        } else {
          await prisma.cateringItem.create({
            data: {
              ...item,
              price: new Decimal(item.price),
              category: item.category as any,
              isActive: true
            }
          });
          createdItems++;
          console.log(`  🆕 Created: ${item.name}`);
        }
      } catch (error) {
        const errorMsg = `Failed to process dessert ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Create appetizer packages
    console.log('📦 Creating appetizer packages...');
    for (const pkg of APPETIZER_PACKAGES) {
      try {
        const existingPackage = await prisma.cateringPackage.findFirst({
          where: { name: pkg.name }
        });

        if (existingPackage) {
          await prisma.cateringPackage.update({
            where: { id: existingPackage.id },
            data: {
              ...pkg,
              pricePerPerson: new Decimal(pkg.pricePerPerson),
              type: pkg.type as any,
              updatedAt: new Date()
            }
          });
          updatedPackages++;
          console.log(`  ✅ Updated package: ${pkg.name}`);
        } else {
          await prisma.cateringPackage.create({
            data: {
              ...pkg,
              pricePerPerson: new Decimal(pkg.pricePerPerson),
              type: pkg.type as any,
              isActive: true
            }
          });
          createdPackages++;
          console.log(`  🆕 Created package: ${pkg.name}`);
        }
      } catch (error) {
        const errorMsg = `Failed to process package ${pkg.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update Store Settings for catering minimum
    console.log('⚙️ Updating store settings...');
    try {
      const existingSettings = await prisma.storeSettings.findFirst();
      
      if (existingSettings) {
        await prisma.storeSettings.update({
          where: { id: existingSettings.id },
          data: {
            cateringMinimumAmount: new Decimal(0), // No minimum for now
            minAdvanceHours: 120, // 5 days = 120 hours
            updatedAt: new Date()
          }
        });
        console.log('  ✅ Updated store settings');
      } else {
        await prisma.storeSettings.create({
          data: {
            name: 'Destino SF',
            cateringMinimumAmount: new Decimal(0),
            taxRate: new Decimal(8.25),
            minAdvanceHours: 120, // 5 days = 120 hours
            isStoreOpen: true
          }
        });
        console.log('  ✅ Created store settings');
      }
    } catch (error) {
      const errorMsg = `Failed to update store settings: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    console.log('\n🎉 Catering Menu Setup Complete!');
    console.log(`📊 Summary:`);
    console.log(`   Items: ${createdItems} created, ${updatedItems} updated`);
    console.log(`   Packages: ${createdPackages} created, ${updatedPackages} updated`);
    
    if (errors.length > 0) {
      console.log(`   ⚠️ Errors: ${errors.length}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Catering menu setup completed successfully',
      packagesCreated: createdPackages,
      packagesUpdated: updatedPackages,
      itemsCreated: createdItems,
      itemsUpdated: updatedItems,
      totalItemsProcessed: createdItems + updatedItems,
      totalPackagesProcessed: createdPackages + updatedPackages,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error setting up catering menu:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      packagesCreated: 0,
      itemsCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 