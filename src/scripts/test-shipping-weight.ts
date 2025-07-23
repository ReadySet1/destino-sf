import { calculateShippingWeight, type CartItemForShipping } from '../lib/shippingUtils';

async function testShippingWeightCalculation() {
  console.log('🧪 Testing shipping weight calculation...\n');

  // Test cases
  const testCases = [
    {
      name: 'Single alfajor pack',
      items: [
        { id: '1', name: 'Alfajores- Classic (1 dozen- packet)', quantity: 1, variantId: 'abc' },
      ],
      expectedWeight: 0.5, // base weight
    },
    {
      name: 'Three alfajor packs',
      items: [
        { id: '1', name: 'Alfajores- Classic (1 dozen- packet)', quantity: 3, variantId: 'abc' },
      ],
      expectedWeight: 0.5 + 2 * 0.4, // base + 2 additional units
    },
    {
      name: 'Single empanada pack',
      items: [{ id: '2', name: 'Empanadas- Beef (frozen- 4 pack)', quantity: 1 }],
      expectedWeight: 1.0, // base weight
    },
    {
      name: 'Mixed cart - alfajores and empanadas',
      items: [
        { id: '1', name: 'Alfajores- Classic (1 dozen- packet)', quantity: 2 },
        { id: '2', name: 'Empanadas- Beef (frozen- 4 pack)', quantity: 1 },
      ],
      expectedWeight: 0.5 + 0.4 + 1.0, // alfajores (base + 1 additional) + empanadas (base)
    },
    {
      name: 'Unknown product type',
      items: [{ id: '3', name: 'Some Random Product', quantity: 2 }],
      expectedWeight: 1.0, // minimum weight (2 * 0.5 default, but min is 1.0)
    },
  ];

  for (const testCase of testCases) {
    try {
      const calculatedWeight = await calculateShippingWeight(testCase.items, 'nationwide_shipping');
      const isCorrect = Math.abs(calculatedWeight - testCase.expectedWeight) < 0.01;

      console.log(`${isCorrect ? '✅' : '❌'} ${testCase.name}`);
      console.log(`   Expected: ${testCase.expectedWeight} lbs`);
      console.log(`   Calculated: ${calculatedWeight} lbs`);

      if (!isCorrect) {
        console.log(`   ⚠️  Weight calculation mismatch!`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Error in test case "${testCase.name}":`, error);
    }
  }

  // Test fulfillment method variations
  console.log('🚚 Testing fulfillment method variations...\n');

  const alfajorItems: CartItemForShipping[] = [
    { id: '1', name: 'Alfajores- Classic (1 dozen- packet)', quantity: 2 },
  ];

  const nationwideWeight = await calculateShippingWeight(alfajorItems, 'nationwide_shipping');
  const localWeight = await calculateShippingWeight(alfajorItems, 'local_delivery');

  console.log('✅ Alfajores (2 packs) - Nationwide shipping:', nationwideWeight, 'lbs');
  console.log('✅ Alfajores (2 packs) - Local delivery:', localWeight, 'lbs');
  console.log('');

  console.log('✨ Shipping weight calculation testing completed!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testShippingWeightCalculation().catch(error => {
    console.error('❌ Error testing shipping weight calculation:', error);
    process.exit(1);
  });
}

export { testShippingWeightCalculation };
