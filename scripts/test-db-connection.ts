#!/usr/bin/env tsx

import { prisma, warmConnection, getConnectionDiagnostics, getHealthStatus } from '../src/lib/db-unified';

async function testDatabaseConnection() {
  console.log('Testing database connection with resilience fixes...\n');

  try {
    // Test warmConnection
    console.log('1. Testing warmConnection...');
    const warmResult = await warmConnection();
    console.log('   Result:', warmResult ? 'Success' : 'Failed');

    // Test getConnectionDiagnostics
    console.log('\n2. Testing getConnectionDiagnostics...');
    const diagnostics = getConnectionDiagnostics();
    console.log('   Diagnostics:', JSON.stringify(diagnostics, null, 2));

    // Test getHealthStatus
    console.log('\n3. Testing getHealthStatus...');
    const health = await getHealthStatus();
    console.log('   Health:', JSON.stringify(health, null, 2));

    // Test a simple query
    console.log('\n4. Testing simple category query...');
    const category = await prisma.category.findFirst({
      where: { active: true },
      select: { id: true, name: true }
    });
    console.log('   Result:', category ? `Found category: ${category.name}` : 'No categories found');

    // Test raw query
    console.log('\n5. Testing raw query...');
    const result = await prisma.$queryRaw`SELECT 1 as test, now() as current_time`;
    console.log('   Query result:', result);

    console.log('\nAll database connection tests passed!');
  } catch (error) {
    console.error('\nDatabase test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
