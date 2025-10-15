#!/usr/bin/env ts-node

/**
 * Setup Example Availability Rules
 *
 * This script creates example availability rules to demonstrate the system.
 * Run with: pnpm tsx scripts/setup-example-availability-rules.ts
 */

import { PrismaClient } from '@prisma/client';
import { AvailabilityState, RuleType } from '@/types/availability';
import { addDays, addWeeks, addMonths } from 'date-fns';

const prisma = new PrismaClient();

interface ExampleRule {
  name: string;
  description: string;
  ruleType: RuleType;
  state: AvailabilityState;
  priority: number;
  enabled: boolean;
  startDate?: Date;
  endDate?: Date;
  seasonalConfig?: any;
  timeRestrictions?: any;
  preOrderSettings?: any;
  viewOnlySettings?: any;
  overrideSquare?: boolean;
}

const EXAMPLE_RULES: Record<string, ExampleRule[]> = {
  // Holiday Specials - High Priority
  holiday: [
    {
      name: 'Thanksgiving Special',
      description: 'Limited-time Thanksgiving menu items',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.AVAILABLE,
      priority: 90,
      enabled: true,
      startDate: new Date('2024-11-20'),
      endDate: new Date('2024-11-30'),
      overrideSquare: true,
    },
    {
      name: 'Christmas Pre-Order',
      description: 'Christmas desserts available for pre-order',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.PRE_ORDER,
      priority: 95,
      enabled: true,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-25'),
      preOrderSettings: {
        message: 'Order your Christmas desserts early! Expected pickup Dec 23-24.',
        expectedDeliveryDate: new Date('2024-12-23'),
        depositRequired: true,
        depositAmount: 25.0,
        maxQuantity: 10,
      },
      overrideSquare: true,
    },
  ],

  // Seasonal Items
  seasonal: [
    {
      name: 'Summer Menu Items',
      description: 'Cold beverages and summer specials',
      ruleType: RuleType.SEASONAL,
      state: AvailabilityState.AVAILABLE,
      priority: 70,
      enabled: true,
      seasonalConfig: {
        startMonth: 5, // May
        startDay: 1,
        endMonth: 9, // September
        endDay: 30,
        yearly: true,
        timezone: 'America/Los_Angeles',
      },
      overrideSquare: true,
    },
    {
      name: 'Winter Warm Drinks',
      description: 'Hot beverages during cold months',
      ruleType: RuleType.SEASONAL,
      state: AvailabilityState.AVAILABLE,
      priority: 70,
      enabled: true,
      seasonalConfig: {
        startMonth: 11, // November
        startDay: 1,
        endMonth: 3, // March
        endDay: 31,
        yearly: true,
        timezone: 'America/Los_Angeles',
      },
      overrideSquare: true,
    },
  ],

  // Weekend Specials
  weekend: [
    {
      name: 'Weekend Brunch Items',
      description: 'Special brunch menu available weekends only',
      ruleType: RuleType.TIME_BASED,
      state: AvailabilityState.AVAILABLE,
      priority: 60,
      enabled: true,
      timeRestrictions: {
        daysOfWeek: [0, 6], // Sunday, Saturday
        startTime: '09:00',
        endTime: '15:00',
        timezone: 'America/Los_Angeles',
      },
      overrideSquare: true,
    },
  ],

  // Limited Availability
  limited: [
    {
      name: 'Limited Edition Item',
      description: 'Special limited edition item - view only when sold out',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.VIEW_ONLY,
      priority: 80,
      enabled: false, // Disabled by default, activate when needed
      viewOnlySettings: {
        message: 'This limited edition item is currently sold out. Check back soon!',
        showPrice: true,
        allowWishlist: true,
        notifyWhenAvailable: true,
      },
      overrideSquare: true,
    },
    {
      name: 'Coming Soon Item',
      description: 'New menu item coming soon',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.COMING_SOON,
      priority: 85,
      enabled: false, // Disabled by default
      viewOnlySettings: {
        message: 'Exciting new menu item coming soon! Stay tuned.',
        showPrice: false,
        allowWishlist: true,
        notifyWhenAvailable: true,
      },
      overrideSquare: true,
    },
  ],

  // Daily Specials
  daily: [
    {
      name: 'Monday Special',
      description: 'Monday only special pricing',
      ruleType: RuleType.TIME_BASED,
      state: AvailabilityState.AVAILABLE,
      priority: 50,
      enabled: true,
      timeRestrictions: {
        daysOfWeek: [1], // Monday
        startTime: '11:00',
        endTime: '21:00',
        timezone: 'America/Los_Angeles',
      },
      overrideSquare: true,
    },
    {
      name: 'Happy Hour',
      description: 'Happy hour special availability',
      ruleType: RuleType.TIME_BASED,
      state: AvailabilityState.AVAILABLE,
      priority: 55,
      enabled: true,
      timeRestrictions: {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        startTime: '15:00',
        endTime: '18:00',
        timezone: 'America/Los_Angeles',
      },
      overrideSquare: true,
    },
  ],

  // Pre-order Examples
  preorder: [
    {
      name: 'Weekly Meal Prep',
      description: 'Meal prep orders for next week',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.PRE_ORDER,
      priority: 75,
      enabled: true,
      startDate: addDays(new Date(), 1),
      endDate: addWeeks(new Date(), 2),
      preOrderSettings: {
        message: 'Order your meal prep for next week! Orders close Sunday at midnight.',
        expectedDeliveryDate: addWeeks(new Date(), 1),
        depositRequired: false,
        maxQuantity: 5,
      },
      overrideSquare: true,
    },
  ],
};

async function getRandomProducts(count: number = 10) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      NOT: {
        category: {
          name: {
            startsWith: 'CATERING',
            mode: 'insensitive',
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    take: count,
    orderBy: {
      name: 'asc',
    },
  });

  return products;
}

async function createExampleRules() {
  console.log('🎯 Setting up example availability rules...\n');

  try {
    // Get some products to assign rules to
    const products = await getRandomProducts(15);

    if (products.length === 0) {
      console.log('❌ No products found. Please add some products first.');
      return;
    }

    console.log(`📦 Found ${products.length} products to create example rules for:\n`);
    products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (${product.category.name})`);
    });
    console.log('');

    // Get a default user ID for creating rules
    const adminUser = await prisma.profile.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    let ruleCount = 0;
    let productIndex = 0;

    // Create rules for different scenarios
    for (const [category, rules] of Object.entries(EXAMPLE_RULES)) {
      console.log(`\n📋 Creating ${category} rules:`);

      for (const ruleTemplate of rules) {
        if (productIndex >= products.length) {
          productIndex = 0; // Reset if we run out of products
        }

        const product = products[productIndex];

        const rule = await prisma.availabilityRule.create({
          data: {
            productId: product.id,
            name: ruleTemplate.name,
            enabled: ruleTemplate.enabled,
            priority: ruleTemplate.priority,
            ruleType: ruleTemplate.ruleType,
            state: ruleTemplate.state,
            startDate: ruleTemplate.startDate,
            endDate: ruleTemplate.endDate,
            seasonalConfig: ruleTemplate.seasonalConfig,
            timeRestrictions: ruleTemplate.timeRestrictions,
            preOrderSettings: ruleTemplate.preOrderSettings,
            viewOnlySettings: ruleTemplate.viewOnlySettings,
            overrideSquare: ruleTemplate.overrideSquare ?? true,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        });

        console.log(`   ✅ ${ruleTemplate.name} → ${product.name}`);
        ruleCount++;
        productIndex++;
      }
    }

    console.log(`\n🎉 Successfully created ${ruleCount} example availability rules!`);
    console.log('\n📊 Rule Summary:');
    console.log(`   • Holiday rules: ${EXAMPLE_RULES.holiday.length}`);
    console.log(`   • Seasonal rules: ${EXAMPLE_RULES.seasonal.length}`);
    console.log(`   • Weekend rules: ${EXAMPLE_RULES.weekend.length}`);
    console.log(`   • Limited availability rules: ${EXAMPLE_RULES.limited.length}`);
    console.log(`   • Daily special rules: ${EXAMPLE_RULES.daily.length}`);
    console.log(`   • Pre-order rules: ${EXAMPLE_RULES.preorder.length}`);

    console.log('\n🔗 You can now view these rules at:');
    console.log('   http://localhost:3000/admin/products/availability');
  } catch (error) {
    console.error('❌ Error creating example rules:', error);
    throw error;
  }
}

async function cleanupExistingExampleRules() {
  console.log('🧹 Cleaning up existing example rules...');

  const exampleRuleNames = Object.values(EXAMPLE_RULES)
    .flat()
    .map(rule => rule.name);

  const deleted = await prisma.availabilityRule.deleteMany({
    where: {
      name: {
        in: exampleRuleNames,
      },
    },
  });

  if (deleted.count > 0) {
    console.log(`   Removed ${deleted.count} existing example rules\n`);
  }
}

async function main() {
  console.log('🚀 Example Availability Rules Setup\n');
  console.log('This script will create example availability rules for demonstration.\n');

  await cleanupExistingExampleRules();
  await createExampleRules();
}

main()
  .catch(e => {
    console.error('💥 Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
