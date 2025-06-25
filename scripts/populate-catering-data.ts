#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { CateringItemCategory, CateringPackageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting catering data population...');

  // Create Catering Items
  const cateringItems = [
    // APPETIZERS/STARTERS - EMPANADAS
    {
      name: 'Tray of Chicken Empanadas',
      description: 'Chicken breast, cream–aji chile reduction and parmesan (25 Pieces)',
      price: 75.00,
      category: CateringItemCategory.STARTER,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/catering/appetizer-package-5.jpg',
      squareCategory: 'CATERING- APPETIZERS'
    },
    {
      name: 'Tray of Beef Empanadas',
      description: 'Ground beef, golden raisins, pimiento stuffed olives, egg (25 Pieces)',
      price: 75.00,
      category: CateringItemCategory.STARTER,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/catering/appetizer-package-7.jpg',
      squareCategory: 'CATERING- APPETIZERS'
    },
    {
      name: 'Tray of Vegetarian Empanadas',
      description: 'Hearts of palms, white cheddar, cilantro, aji amarillo (25 Pieces)',
      price: 75.00,
      category: CateringItemCategory.STARTER,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/catering/appetizer-package-9.jpg',
      squareCategory: 'CATERING- APPETIZERS'
    },
    {
      name: 'Tray of Spinach Empanadas',
      description: 'Sautéed spinach, ricotta cheese, garlic, and onions (25 Pieces)',
      price: 75.00,
      category: CateringItemCategory.STARTER,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/catering/appetizer-package-5.jpg',
      squareCategory: 'CATERING- APPETIZERS'
    },

    // ENTREES
    {
      name: 'Chicken with Mojo',
      description: 'Grilled chicken breast, piquillo pepper, onions, orange-garlic mojo',
      price: 8.50,
      category: CateringItemCategory.ENTREE,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: true,
      servingSize: '6 Ounces',
      isActive: true,
      imageUrl: '/images/catering/entrees/chicken-mojo.jpg',
      squareCategory: 'CATERING- ENTREES'
    },
    {
      name: 'Acorn Squash',
      description: 'Roasted squash, sweet potato puree, mushrooms, coconut milk, carrot, pepitas, romesco salsa',
      price: 8.00,
      category: CateringItemCategory.ENTREE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      servingSize: '6 Ounces',
      isActive: true,
      imageUrl: '/images/catering/entrees/acorn-squash.jpg',
      squareCategory: 'CATERING- ENTREES'
    },
    {
      name: 'Salmon with Chimichurri',
      description: 'Grilled Atlantic salmon, fresh herbs chimichurri, citrus marinade',
      price: 12.00,
      category: CateringItemCategory.ENTREE,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: true,
      servingSize: '6 Ounces',
      isActive: true,
      imageUrl: '/images/catering/entrees/salmon-chimichurri.jpg',
      squareCategory: 'CATERING- ENTREES'
    },
    {
      name: 'Beef Tenderloin',
      description: 'Grilled beef tenderloin, red wine reduction, roasted vegetables',
      price: 15.00,
      category: CateringItemCategory.ENTREE,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: true,
      servingSize: '8 Ounces',
      isActive: true,
      imageUrl: '/images/catering/entrees/beef-tenderloin.jpg',
      squareCategory: 'CATERING- ENTREES'
    },

    // SIDES
    {
      name: 'Arroz Verde',
      description: 'Cilantro infused rice, red bell pepper, english peas, aji amarillo, spices',
      price: 3.50,
      category: CateringItemCategory.SIDE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      isActive: true,
      imageUrl: '/images/catering/sides/arroz-verde.jpg',
      squareCategory: 'CATERING- SIDES'
    },
    {
      name: 'Arroz Rojo',
      description: 'White rice, tomatoes, onion, oregano',
      price: 3.00,
      category: CateringItemCategory.SIDE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      isActive: true,
      imageUrl: '/images/catering/sides/arroz-rojo.jpg',
      squareCategory: 'CATERING- SIDES'
    },
    {
      name: 'Black Beans',
      description: 'Cuban style black beans, sofrito, bay leaves, cumin',
      price: 3.25,
      category: CateringItemCategory.SIDE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      isActive: true,
      imageUrl: '/images/catering/sides/black-beans.jpg',
      squareCategory: 'CATERING- SIDES'
    },
    {
      name: 'Sweet Plantains',
      description: 'Caramelized sweet plantains, cinnamon, brown sugar',
      price: 3.75,
      category: CateringItemCategory.SIDE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      isActive: true,
      imageUrl: '/images/catering/sides/sweet-plantains.jpg',
      squareCategory: 'CATERING- SIDES'
    },

    // SALADS
    {
      name: 'Arugula & Pear Salad',
      description: 'Baby arugula with sliced pears, candied walnuts, and balsamic vinaigrette',
      price: 11.00,
      category: CateringItemCategory.SALAD,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: true,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/salads/arugula-pear.jpg',
      squareCategory: 'CATERING- SALADS'
    },
    {
      name: 'Mixed Greens Salad',
      description: 'Fresh mixed greens with cherry tomatoes, cucumber, and house vinaigrette',
      price: 8.00,
      category: CateringItemCategory.SALAD,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/salads/mixed-greens.jpg',
      squareCategory: 'CATERING- SALADS'
    },
    {
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing',
      price: 9.00,
      category: CateringItemCategory.SALAD,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/salads/caesar.jpg',
      squareCategory: 'CATERING- SALADS'
    },
    {
      name: 'Mediterranean Quinoa Salad',
      description: 'Quinoa with olives, feta, tomatoes, and lemon herb dressing',
      price: 10.00,
      category: CateringItemCategory.SALAD,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: true,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/salads/quinoa-mediterranean.jpg',
      squareCategory: 'CATERING- SALADS'
    },

    // DESSERTS
    {
      name: 'Tray of Alfajores',
      description: 'South american butter cookies, dulce de leche',
      price: 55.00,
      category: CateringItemCategory.DESSERT,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/alfajores-dulce.jpg',
      squareCategory: 'CATERING- DESSERTS'
    },
    {
      name: 'Chocolate Alfajores Tray',
      description: 'South american butter cookies with chocolate coating and dulce de leche',
      price: 60.00,
      category: CateringItemCategory.DESSERT,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: '25 Pieces',
      isActive: true,
      imageUrl: '/images/alfajores-chocolate.jpg',
      squareCategory: 'CATERING- DESSERTS'
    },
    {
      name: 'Tres Leches Cake',
      description: 'Traditional Latin sponge cake soaked in three milks',
      price: 45.00,
      category: CateringItemCategory.DESSERT,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/desserts/tres-leches.jpg',
      squareCategory: 'CATERING- DESSERTS'
    },

    // BEVERAGES
    {
      name: 'Agua Fresca Pitcher',
      description: 'Fresh fruit water - choice of watermelon, pineapple, or hibiscus',
      price: 15.00,
      category: CateringItemCategory.BEVERAGE,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      servingSize: 'Serves 8-10',
      isActive: true,
      imageUrl: '/images/catering/beverages/agua-fresca.jpg',
      squareCategory: 'CATERING- BEVERAGES'
    },
    {
      name: 'Coffee Service',
      description: 'Freshly brewed coffee with cream, sugar, and sweeteners',
      price: 25.00,
      category: CateringItemCategory.BEVERAGE,
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: true,
      servingSize: 'Serves 10-12',
      isActive: true,
      imageUrl: '/images/catering/beverages/coffee-service.jpg',
      squareCategory: 'CATERING- BEVERAGES'
    }
  ];

  console.log('📝 Creating catering items...');
  for (const item of cateringItems) {
    await prisma.cateringItem.create({ data: item });
    console.log(`✅ Created item: ${item.name}`);
  }

  // Create Catering Packages
  const cateringPackages = [
    {
      name: 'Appetizer Selection Package',
      description: 'Perfect starter for any event with a variety of our signature empanadas',
      minPeople: 10,
      pricePerPerson: 8.50,
      type: CateringPackageType.INDIVIDUAL,
      imageUrl: '/images/catering/appetizer-selection.jpg',
      isActive: true,
      featuredOrder: 1,
      dietaryOptions: ['Vegetarian options available'],
      squareCategory: 'CATERING- PACKAGES'
    },
    {
      name: 'Premium Appetizer Package',
      description: 'Elevated appetizer selection for special occasions',
      minPeople: 15,
      pricePerPerson: 12.00,
      type: CateringPackageType.INDIVIDUAL,
      imageUrl: '/images/catering/premium-appetizer-package.jpg',
      isActive: true,
      featuredOrder: 2,
      dietaryOptions: ['Vegetarian options available', 'Gluten-free options available'],
      squareCategory: 'CATERING- PACKAGES'
    },
    {
      name: 'Family Style Dinner',
      description: 'Traditional family-style service with shared entrees and sides',
      minPeople: 8,
      pricePerPerson: 22.00,
      type: CateringPackageType.FAMILY_STYLE,
      imageUrl: '/images/catering/default-individual.jpg',
      isActive: true,
      featuredOrder: 3,
      dietaryOptions: ['Vegetarian options available', 'Vegan options available', 'Gluten-free options available'],
      squareCategory: 'CATERING- PACKAGES'
    },
    {
      name: 'Buffet Service',
      description: 'Full buffet setup with variety of entrees, sides, and salads',
      minPeople: 20,
      pricePerPerson: 18.50,
      type: CateringPackageType.BUFFET,
      imageUrl: '/images/catering/default-buffet.jpg',
      isActive: true,
      featuredOrder: 4,
      dietaryOptions: ['Vegetarian options available', 'Vegan options available', 'Gluten-free options available'],
      squareCategory: 'CATERING- PACKAGES'
    },
    {
      name: 'Executive Boxed Lunch',
      description: 'Individual boxed lunches perfect for corporate events',
      minPeople: 5,
      pricePerPerson: 15.00,
      type: CateringPackageType.BOXED_LUNCH,
      imageUrl: '/images/catering/boxed-lunch-package.jpg',
      isActive: true,
      featuredOrder: 5,
      dietaryOptions: ['Vegetarian options available', 'Gluten-free options available'],
      squareCategory: 'BOXED_LUNCH_PACKAGES'
    },
    {
      name: 'Deluxe Boxed Lunch',
      description: 'Premium boxed lunch with upgraded sides and dessert',
      minPeople: 5,
      pricePerPerson: 18.00,
      type: CateringPackageType.BOXED_LUNCH,
      imageUrl: '/images/catering/tier-2-lunch.jpg',
      isActive: true,
      featuredOrder: 6,
      dietaryOptions: ['Vegetarian options available', 'Gluten-free options available'],
      squareCategory: 'BOXED_LUNCH_PACKAGES'
    },
    {
      name: 'Premium Boxed Lunch',
      description: 'Our most luxurious boxed lunch option with gourmet selections',
      minPeople: 5,
      pricePerPerson: 22.00,
      type: CateringPackageType.BOXED_LUNCH,
      imageUrl: '/images/catering/tier-3-lunch.jpg',
      isActive: true,
      featuredOrder: 7,
      dietaryOptions: ['Vegetarian options available', 'Gluten-free options available'],
      squareCategory: 'BOXED_LUNCH_PACKAGES'
    }
  ];

  console.log('📦 Creating catering packages...');
  for (const pkg of cateringPackages) {
    await prisma.cateringPackage.create({ data: pkg });
    console.log(`✅ Created package: ${pkg.name}`);
  }

  console.log('🎉 Catering data population completed successfully!');
  console.log(`📊 Created ${cateringItems.length} items and ${cateringPackages.length} packages`);
}

main()
  .catch((e) => {
    console.error('❌ Error populating catering data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 