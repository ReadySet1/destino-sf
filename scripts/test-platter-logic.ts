#!/usr/bin/env tsx

/**
 * Test script to verify platter logic is working correctly
 * Run with: pnpm tsx scripts/test-platter-logic.ts
 */

interface TestCateringItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

// Test data based on actual Square data
const testItems: TestCateringItem[] = [
  {
    id: '1',
    name: 'Cheese & Charcuterie Platter - Small',
    price: 150.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '2',
    name: 'Cheese & Charcuterie Platter - Large',
    price: 280.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '3',
    name: 'Plantain Chips Platter - Small',
    price: 45.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '4',
    name: 'Plantain Chips Platter - Large',
    price: 80.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '5',
    name: 'Cocktail Prawn Platter - Small',
    price: 80.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '6',
    name: 'Cocktail Prawn Platter - Large',
    price: 150.0,
    category: 'CATERING- SHARE PLATTERS'
  },
  {
    id: '7',
    name: 'Empanada - Chicken',
    price: 0,
    category: 'CATERING- APPETIZERS'
  },
  {
    id: '8',
    name: 'Empanada - Salmon',
    price: 0,
    category: 'CATERING- APPETIZERS'
  }
];

// Function to check if an item is a platter item (copied from ALaCarteMenu.tsx)
function isPlatterItem(item: TestCateringItem): boolean {
  const name = item.name.toLowerCase();
  const hasPlatter = name.includes('platter');
  const hasSize = name.includes('small') || name.includes('large');
  
  return hasPlatter && hasSize;
}

// Function to get base platter name (copied from ALaCarteMenu.tsx)
function getBasePlatterName(name: string): string {
  return name.replace(/ - (Small|Large)$/, '');
}

// Function to group platter items by base name (copied from ALaCarteMenu.tsx)
function groupPlatterItems(items: TestCateringItem[]): Record<string, TestCateringItem[]> {
  const platterGroups: Record<string, TestCateringItem[]> = {};

  console.log(`🔍 Grouping ${items.length} items for platter detection...`);
  
  items.forEach((item, index) => {
    const isPlatter = isPlatterItem(item);
    console.log(`  ${index + 1}. "${item.name}" - isPlatter: ${isPlatter}`);
    
    if (isPlatter) {
      const baseName = getBasePlatterName(item.name);
      if (!platterGroups[baseName]) {
        platterGroups[baseName] = [];
      }
      platterGroups[baseName].push(item);
      console.log(`    ✅ Added to platter group: "${baseName}"`);
    }
  });

  console.log(`📊 Platter grouping result:`, {
    totalItems: items.length,
    platterGroups: Object.keys(platterGroups),
    groupCounts: Object.fromEntries(
      Object.entries(platterGroups).map(([name, items]) => [name, items.length])
    )
  });

  return platterGroups;
}

// Main test function
function runPlatterLogicTest() {
  console.log('🧪 Testing Platter Logic\n');
  console.log('=' .repeat(50));
  
  // Test individual platter detection
  console.log('\n1️⃣ Testing individual platter detection:');
  testItems.forEach(item => {
    const result = isPlatterItem(item);
    console.log(`   "${item.name}" -> ${result ? '✅ PLATTER' : '❌ NOT PLATTER'}`);
  });
  
  // Test platter grouping
  console.log('\n2️⃣ Testing platter grouping:');
  const platterGroups = groupPlatterItems(testItems);
  
  // Test base name extraction
  console.log('\n3️⃣ Testing base name extraction:');
  Object.keys(platterGroups).forEach(baseName => {
    const items = platterGroups[baseName];
    console.log(`   Base: "${baseName}"`);
    items.forEach(item => {
      const extracted = getBasePlatterName(item.name);
      console.log(`     "${item.name}" -> "${extracted}"`);
    });
  });
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📋 TEST SUMMARY:');
  console.log(`   Total items: ${testItems.length}`);
  console.log(`   Platter items: ${testItems.filter(isPlatterItem).length}`);
  console.log(`   Non-platter items: ${testItems.filter(item => !isPlatterItem(item)).length}`);
  console.log(`   Platter groups: ${Object.keys(platterGroups).length}`);
  
  const expectedPlatterGroups = ['Cheese & Charcuterie Platter', 'Plantain Chips Platter', 'Cocktail Prawn Platter'];
  const actualPlatterGroups = Object.keys(platterGroups);
  
  console.log('\n🎯 EXPECTED vs ACTUAL:');
  expectedPlatterGroups.forEach(expected => {
    const found = actualPlatterGroups.includes(expected);
    console.log(`   "${expected}" -> ${found ? '✅ FOUND' : '❌ MISSING'}`);
  });
  
  if (actualPlatterGroups.length === expectedPlatterGroups.length) {
    console.log('\n✅ SUCCESS: All expected platter groups found!');
  } else {
    console.log('\n❌ FAILURE: Some platter groups are missing!');
    console.log(`   Expected: ${expectedPlatterGroups.length}, Found: ${actualPlatterGroups.length}`);
  }
}

// Run the test
runPlatterLogicTest();

export { isPlatterItem, getBasePlatterName, groupPlatterItems };
export type { TestCateringItem };
