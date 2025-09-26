#!/usr/bin/env node

/**
 * Database Connection Diagnostic Script
 * Tests multiple connection methods to find what works on public networks
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve('.env.local') });

const connections = [
  {
    name: 'Pooler Connection (6543)',
    url: `postgresql://postgres.drrejylrcjbeldnzodjd:${process.env.POSTGRES_PASSWORD || '[PASSWORD]'}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0&pool_timeout=300&connection_timeout=30`
  },
  {
    name: 'Direct Connection (5432)',
    url: `postgresql://postgres.drrejylrcjbeldnzodjd:${process.env.POSTGRES_PASSWORD || '[PASSWORD]'}@db.drrejylrcjbeldnzodjd.supabase.co:5432/postgres`
  },
  {
    name: 'Alternative Pooler (Transaction Mode)',
    url: `postgresql://postgres.drrejylrcjbeldnzodjd:${process.env.POSTGRES_PASSWORD || '[PASSWORD]'}@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&prepared_statements=false`
  }
];

async function testConnection(connectionConfig) {
  console.log(`\n🔍 Testing: ${connectionConfig.name}`);
  console.log(`URL: ${connectionConfig.url.replace(/:[^:@]+@/, ':***@')}`);
  
  const client = new PrismaClient({
    datasources: {
      db: { url: connectionConfig.url }
    },
    log: ['error']
  });

  try {
    const start = Date.now();
    
    // Test connection
    await client.$connect();
    console.log('✅ Connection established');
    
    // Test query
    const result = await client.$queryRaw`SELECT 1 as test, version() as db_version`;
    const latency = Date.now() - start;
    
    console.log(`✅ Query successful (${latency}ms)`);
    console.log(`📊 Database version: ${result[0].db_version.split(' ')[0]}`);
    
    await client.$disconnect();
    return { success: true, latency, error: null };
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    
    try {
      await client.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    return { success: false, latency: null, error: error.message };
  }
}

async function testAllConnections() {
  console.log('🚀 Database Connection Diagnostic Tool');
  console.log('=====================================');
  
  const results = [];
  
  for (const connection of connections) {
    const result = await testConnection(connection);
    results.push({ ...connection, ...result });
    
    if (result.success) {
      console.log(`\n🎉 SUCCESS! This connection works on your network.`);
      console.log(`\n📋 Recommended DATABASE_URL for .env.local:`);
      console.log(`DATABASE_URL="${connection.url}"`);
      break;
    }
    
    // Wait between attempts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 Summary:');
  console.log('===========');
  
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    console.log(`✅ Found ${successful.length} working connection(s)`);
    console.log(`🚀 Fastest connection: ${successful[0].name} (${successful[0].latency}ms)`);
  } else {
    console.log('❌ No connections worked. This might be a network firewall issue.');
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check if your network blocks outbound database connections');
    console.log('2. Try switching to a different network (mobile hotspot)');
    console.log('3. Contact your network administrator about PostgreSQL ports');
    console.log('4. Use a VPN to bypass network restrictions');
  }
  
  process.exit(successful.length > 0 ? 0 : 1);
}

// Handle password prompts
if (!process.env.POSTGRES_PASSWORD) {
  console.log('⚠️  Warning: POSTGRES_PASSWORD not found in environment');
  console.log('Please add it to your .env.local file or pass it via command line:');
  console.log('POSTGRES_PASSWORD=your_password node scripts/test-db-connection.mjs');
  process.exit(1);
}

testAllConnections().catch(console.error);

