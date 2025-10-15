#!/usr/bin/env tsx

// Quick script to run production sync for all Square products including catering
import { syncProductsProduction } from '../src/lib/square/production-sync';

async function main() {
  try {
    console.log('🚀 Starting production sync for all products including catering...');

    const result = await syncProductsProduction({
      validateImages: true,
      batchSize: 25,
      enableCleanup: true,
    });

    console.log('✅ Sync completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
