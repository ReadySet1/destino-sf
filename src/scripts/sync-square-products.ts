#!/usr/bin/env tsx

/**
 * Square Products Sync Script
 * 
 * This script properly loads environment variables and syncs products from Square
 * Usage: pnpm tsx src/scripts/sync-square-products.ts
 */

// Load environment variables in the correct order
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (development), then .env (fallback)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Now import the sync function
import { syncSquareProducts } from '../lib/square/sync';

async function main() {
  console.log('🚀 Starting Square Products Sync...');
  console.log('====================================');
  
  // Verify environment variables are loaded
  console.log('🔍 Environment Check:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`   SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`   SQUARE_APPLICATION_ID: ${process.env.SQUARE_APPLICATION_ID ? '✅ Loaded' : '❌ Missing'}`);
  console.log('');

  try {
    const result = await syncSquareProducts();
    
    console.log('✅ Sync completed successfully!');
    console.log('📊 Results:');
    console.log(`   Products synced: ${result.syncedProducts}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message || 'No message'}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main(); 