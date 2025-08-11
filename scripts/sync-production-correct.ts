#!/usr/bin/env tsx

// Script to sync Square products using ProductionSyncManager directly to products table
import { syncProductsProduction } from '../src/lib/square/production-sync';

async function main() {
  try {
    console.log('🚀 Starting production sync with ProductionSyncManager...');
    console.log('📋 This will populate the products table (not catering_items)');
    
    const result = await syncProductsProduction({
      validateImages: true,
      enableCleanup: true,
      batchSize: 25
    });
    
    console.log('\n🎉 Production sync completed!');
    console.log('📊 Results:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Message: ${result.message}`);
    console.log(`   - Synced Products: ${result.syncedProducts}`);
    console.log(`   - Skipped Products: ${result.skippedProducts}`);
    console.log(`   - Errors: ${result.errors.length}`);
    console.log(`   - Warnings: ${result.warnings.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (result.productDetails) {
      console.log('\n📝 Product Details:');
      console.log(`   - Created: ${result.productDetails.created}`);
      console.log(`   - Updated: ${result.productDetails.updated}`);
      console.log(`   - With Images: ${result.productDetails.withImages}`);
      console.log(`   - Without Images: ${result.productDetails.withoutImages}`);
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();