/**
 * Fix script to sync the missing CATERING- BOXED LUNCH ENTREES items
 * This will force-update the specific category to sync the 3 missing items
 */

const API_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/square/unified-sync`
  : 'http://localhost:3000/api/square/unified-sync';

async function fixMissingBoxedLunchItems() {
  try {
    console.log('🔧 Starting targeted sync for CATERING- BOXED LUNCH ENTREES...');
    console.log(`🌐 API URL: ${API_URL}`);
    
    const requestBody = {
      dryRun: false,
      categories: ['CATERING- BOXED LUNCH ENTREES'], // Target only this category
      forceUpdate: true, // Force update to ensure sync
    };
    
    console.log('📡 Making API request to unified-sync endpoint...');
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('\n✅ Sync completed successfully!');
    console.log('📊 Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.sync) {
      console.log(`   Synced Products: ${result.sync.syncedProducts}`);
      console.log(`   Skipped Products: ${result.sync.skippedProducts}`);
      console.log(`   Errors: ${result.sync.errors}`);
    }
    
    if (result.data?.verification) {
      console.log('\n🔍 Verification Results:');
      console.log(`   Total Discrepancy: ${result.data.verification.totalDiscrepancy}`);
      
      // Look specifically for the BOXED LUNCH ENTREES category
      const boxedLunchCategory = result.data.verification.categories?.find(cat => 
        cat.localName?.includes('BOXED LUNCH ENTREES')
      );
      
      if (boxedLunchCategory) {
        console.log('\n📦 CATERING- BOXED LUNCH ENTREES category:');
        console.log(`   Square items: ${boxedLunchCategory.itemCount?.square || 'Unknown'}`);
        console.log(`   Local items: ${boxedLunchCategory.itemCount?.local || 'Unknown'}`);
        console.log(`   Discrepancy: ${boxedLunchCategory.itemCount?.discrepancy || 'Unknown'}`);
      }
    }
    
    if (result.data?.performance) {
      console.log('\n⏱️  Performance:');
      console.log(`   Total time: ${result.data.performance.totalTimeSeconds}s`);
      console.log(`   Square fetch time: ${result.data.performance.squareFetchSeconds}s`);
      console.log(`   DB operations time: ${result.data.performance.dbOperationsSeconds}s`);
    }
    
    console.log('\n🎉 Missing products should now be synced to production!');
    console.log('Expected to add:');
    console.log('   1. Acorn Squash');
    console.log('   2. Beef Stir Fry'); 
    console.log('   3. Churrasco with Chimichurri');
    
  } catch (error) {
    console.error('❌ Error running targeted sync:', error);
    console.error('\nThis could be due to:');
    console.error('1. Authentication issue (need to be logged in)');
    console.error('2. API endpoint not available');
    console.error('3. Network connectivity issue');
    console.error('\nTry running the sync from the admin panel instead.');
  }
}

// Run the fix
fixMissingBoxedLunchItems().catch(console.error);
