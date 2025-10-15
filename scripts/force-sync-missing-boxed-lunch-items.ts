#!/usr/bin/env tsx

/**
 * Force Sync Missing Boxed Lunch Items
 *
 * Implementation of Option 1 from the master plan:
 * Use forceUpdate parameter to bypass duplicate detection and sync the 3 missing items
 *
 * Missing items (from master plan):
 * - Acorn Squash (GZNXPT6ONKIIUIMPD3PJV64U)
 * - Beef Stir Fry (XXTYXJS5IH7Y7ILKUAOVSNAZ)
 * - Churrasco with Chimichurri (ZDUYM3XR5JWZ4VZWN43MZM5X)
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

interface SyncResponse {
  success: boolean;
  message: string;
  sync: {
    syncedProducts: number;
    skippedProducts: number;
    errors: number;
  };
  data: {
    verification: {
      categories: Array<{
        squareName: string;
        itemCount: {
          square: number;
          local: number;
          discrepancy: number;
        };
      }>;
      totalDiscrepancy: number;
    };
  };
}

async function forceSyncMissingItems(): Promise<void> {
  console.log('🎯 MASTER PLAN FIX: Force syncing missing BOXED LUNCH ENTREES items...');
  console.log('');
  console.log('Missing items to be synced:');
  console.log('- Acorn Squash (GZNXPT6ONKIIUIMPD3PJV64U)');
  console.log('- Beef Stir Fry (XXTYXJS5IH7Y7ILKUAOVSNAZ)');
  console.log('- Churrasco with Chimichurri (ZDUYM3XR5JWZ4VZWN43MZM5X)');
  console.log('');

  try {
    // Get the API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const syncEndpoint = `${apiUrl}/api/square/unified-sync`;

    console.log(`📡 Calling sync endpoint: ${syncEndpoint}`);
    console.log('');

    // Make the force sync request
    const response = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper authentication headers
        // For now, assuming this script runs locally or in a trusted environment
      },
      body: JSON.stringify({
        forceUpdate: true, // KEY: Bypass duplicate detection
        categories: ['CATERING- BOXED LUNCH ENTREES'], // Target specific category
        dryRun: false, // Actually perform the sync
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SyncResponse = await response.json();

    console.log('🎯 FORCE SYNC RESULTS:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    console.log('');

    console.log('📊 SYNC SUMMARY:');
    console.log(`   • Synced Products: ${result.sync.syncedProducts}`);
    console.log(`   • Skipped Products: ${result.sync.skippedProducts}`);
    console.log(`   • Errors: ${result.sync.errors}`);
    console.log('');

    // Find the boxed lunch entrees category in verification
    const boxedLunchCategory = result.data.verification.categories.find(
      cat =>
        cat.squareName.includes('BOXED LUNCH ENTREES') ||
        cat.squareName.includes('BOXED_LUNCH_ENTREES')
    );

    if (boxedLunchCategory) {
      console.log('📈 BOXED LUNCH ENTREES VERIFICATION:');
      console.log(`   • Square Count: ${boxedLunchCategory.itemCount.square}`);
      console.log(`   • Local Count: ${boxedLunchCategory.itemCount.local}`);
      console.log(`   • Discrepancy: ${boxedLunchCategory.itemCount.discrepancy}`);
      console.log('');

      if (boxedLunchCategory.itemCount.discrepancy === 0) {
        console.log('🎉 SUCCESS: No discrepancy detected! All items synced.');
      } else {
        console.log(
          `⚠️  DISCREPANCY STILL EXISTS: ${boxedLunchCategory.itemCount.discrepancy} items missing`
        );
      }
    } else {
      console.log('⚠️  Could not find BOXED LUNCH ENTREES category in verification results');
    }

    console.log('');
    console.log(
      `🔍 Total Discrepancy Across All Categories: ${result.data.verification.totalDiscrepancy}`
    );

    if (result.data.verification.totalDiscrepancy === 0) {
      console.log('');
      console.log('🎉 MASTER PLAN SUCCESS: All items synced successfully!');
      console.log('The production database now matches Square with all 129 items.');
    } else {
      console.log('');
      console.log('⚠️  Additional work needed: Some discrepancies remain.');
      console.log('Consider running a full sync or investigating specific categories.');
    }
  } catch (error) {
    console.error('❌ FORCE SYNC FAILED:', error);
    console.error('');
    console.error('Troubleshooting steps:');
    console.error('1. Ensure your development server is running (pnpm dev)');
    console.error('2. Check environment variables in .env.local');
    console.error('3. Verify Square API credentials');
    console.error('4. Try running the sync manually from the admin panel');
    process.exit(1);
  }
}

// Run the script (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  forceSyncMissingItems()
    .then(() => {
      console.log('');
      console.log('🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { forceSyncMissingItems };
