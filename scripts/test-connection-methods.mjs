#!/usr/bin/env node

/**
 * Test all available connection methods and recommend the best approach
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve('.env.local') });

async function testPrismaConnection() {
  console.log('\n🔍 Testing Prisma connection...');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const start = Date.now();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    const latency = Date.now() - start;
    
    await prisma.$disconnect();
    
    console.log(`✅ Prisma works! (${latency}ms)`);
    return { success: true, latency, method: 'prisma' };
  } catch (error) {
    console.log(`❌ Prisma failed: ${error.message}`);
    return { success: false, error: error.message, method: 'prisma' };
  }
}

async function testSupabaseHTTP() {
  console.log('\n🔍 Testing Supabase HTTP API...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const start = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    const latency = Date.now() - start;
    console.log(`✅ Supabase HTTP API works! (${latency}ms)`);
    return { success: true, latency, method: 'supabase-http' };
  } catch (error) {
    console.log(`❌ Supabase HTTP failed: ${error.message}`);
    return { success: false, error: error.message, method: 'supabase-http' };
  }
}

async function testFallbackManager() {
  console.log('\n🔍 Testing Fallback Manager...');
  try {
    // Import the fallback manager we created
    const { dbFallbackManager } = await import('../src/lib/db-fallback-manager.ts');
    
    const start = Date.now();
    const packages = await dbFallbackManager.getCateringPackages();
    const latency = Date.now() - start;
    
    const status = dbFallbackManager.getConnectionStatus();
    
    console.log(`✅ Fallback Manager works! (${latency}ms)`);
    console.log(`📊 Using method: ${status.method}`);
    console.log(`📦 Retrieved ${packages.length} catering packages`);
    
    return { 
      success: true, 
      latency, 
      method: 'fallback-manager',
      connectionMethod: status.method,
      dataCount: packages.length
    };
  } catch (error) {
    console.log(`❌ Fallback Manager failed: ${error.message}`);
    return { success: false, error: error.message, method: 'fallback-manager' };
  }
}

async function main() {
  console.log('🚀 Database Connection Method Tester');
  console.log('====================================');
  
  const results = [];
  
  // Test all methods
  results.push(await testPrismaConnection());
  results.push(await testSupabaseHTTP());
  results.push(await testFallbackManager());
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('==========');
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (working.length > 0) {
    console.log(`✅ ${working.length} method(s) working:`);
    working.forEach(result => {
      console.log(`   - ${result.method}: ${result.latency}ms`);
      if (result.connectionMethod) {
        console.log(`     └─ Using: ${result.connectionMethod}`);
      }
    });
    
    const fastest = working.reduce((prev, current) => 
      prev.latency < current.latency ? prev : current
    );
    console.log(`\n🚀 Fastest method: ${fastest.method} (${fastest.latency}ms)`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} method(s) failed:`);
    failed.forEach(result => {
      console.log(`   - ${result.method}: ${result.error}`);
    });
  }
  
  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS');
  console.log('==================');
  
  if (working.some(r => r.method === 'prisma')) {
    console.log('✅ Prisma works - no changes needed');
  } else if (working.some(r => r.method === 'supabase-http')) {
    console.log('🌐 Use HTTP API fallback - your network blocks database ports');
    console.log('   The fallback manager will automatically handle this');
  } else {
    console.log('⚠️ No database connections work');
    console.log('   Try: mobile hotspot, VPN, or different network');
  }
  
  process.exit(working.length > 0 ? 0 : 1);
}

main().catch(console.error);
