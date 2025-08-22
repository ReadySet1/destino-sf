#!/usr/bin/env tsx

import { startupDatabase, checkDatabaseHealth } from '../src/lib/db';
import { checkDatabaseHealth as checkHealthUtils } from '../src/lib/db-utils';

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test startup function
    console.log('\n1. Testing database startup...');
    await startupDatabase();
    
    // Test health check from db.ts
    console.log('\n2. Testing health check from db.ts...');
    const health1 = await checkDatabaseHealth();
    console.log('Health check result:', health1);
    
    // Test health check from db-utils.ts
    console.log('\n3. Testing health check from db-utils.ts...');
    const health2 = await checkHealthUtils();
    console.log('Health check result:', health2);
    
    // Test a simple query
    console.log('\n4. Testing simple query...');
    const { prisma } = await import('../src/lib/db');
    const result = await prisma.$queryRaw`SELECT 1 as test, now() as current_time`;
    console.log('Query result:', result);
    
    console.log('\n✅ All database tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  } finally {
    const { prisma } = await import('../src/lib/db');
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
