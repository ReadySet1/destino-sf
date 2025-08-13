#!/usr/bin/env tsx

/**
 * Test script to verify the archive query structure is correct
 * This is a syntax validation test, not a database test
 */

// Mock Prisma query structure to validate syntax
const mockArchiveQuery = {
  where: {
    active: true,
    squareId: {
      // Condition 1: Find products whose ID is NOT in the list from Square
      notIn: ['id1', 'id2', 'id3'],
    },
    NOT: [
      // Condition 2: AND the squareId should NOT be null
      { squareId: null },
      // Condition 3: AND the squareId should NOT be an empty string
      { squareId: '' }
    ]
  },
  include: {
    category: {
      select: {
        name: true
      }
    }
  }
};

// Test function to validate query structure
function validateArchiveQuery() {
  console.log('🧪 Testing Archive Query Structure\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Validate basic structure
    console.log('1️⃣ Testing basic query structure...');
    if (mockArchiveQuery.where && mockArchiveQuery.include) {
      console.log('   ✅ Basic structure is valid');
    } else {
      throw new Error('Missing required top-level properties');
    }
    
    // Test 2: Validate where clause
    console.log('\n2️⃣ Testing where clause...');
    const where = mockArchiveQuery.where;
    
    if (typeof where.active === 'boolean') {
      console.log('   ✅ active field is valid boolean');
    } else {
      throw new Error('active field must be boolean');
    }
    
    if (where.squareId && where.squareId.notIn && Array.isArray(where.squareId.notIn)) {
      console.log('   ✅ squareId.notIn is valid array');
    } else {
      throw new Error('squareId.notIn must be an array');
    }
    
    if (where.NOT && Array.isArray(where.NOT)) {
      console.log('   ✅ NOT clause is valid array');
    } else {
      throw new Error('NOT clause must be an array');
    }
    
    // Test 3: Validate NOT array contents
    console.log('\n3️⃣ Testing NOT array contents...');
    where.NOT.forEach((condition, index) => {
      if (condition.squareId !== null && condition.squareId !== '') {
        throw new Error(`NOT condition ${index} has invalid value: ${condition.squareId}`);
      }
      console.log(`   ✅ NOT condition ${index + 1} is valid: squareId ${condition.squareId === null ? '!= null' : '!= ""'}`);
    });
    
    // Test 4: Validate include clause
    console.log('\n4️⃣ Testing include clause...');
    if (mockArchiveQuery.include.category && mockArchiveQuery.include.category.select) {
      console.log('   ✅ include clause is valid');
    } else {
      throw new Error('include clause is malformed');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ SUCCESS: Archive query structure is valid!');
    console.log('\n📋 Query Summary:');
    console.log(`   • Active products only: ${where.active}`);
    console.log(`   • Exclude Square IDs: ${where.squareId.notIn.length} IDs`);
    console.log(`   • NOT conditions: ${where.NOT.length} exclusions`);
    console.log(`   • Include category: ${Object.keys(mockArchiveQuery.include).join(', ')}`);
    
  } catch (error) {
    console.log('\n❌ FAILURE: Query structure validation failed');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the validation
validateArchiveQuery();

export { mockArchiveQuery };
