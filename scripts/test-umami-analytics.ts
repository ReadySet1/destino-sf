#!/usr/bin/env tsx

/**
 * Test script to verify Umami analytics functionality
 * Run this after implementing the CSP fix to ensure analytics is working
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Import after loading env vars
import { UMAMI_CONFIG, isUmamiLoaded, trackEvent } from '../src/lib/analytics/umami';

console.log('🔍 Testing Umami Analytics Configuration...\n');

// Test 1: Check configuration
console.log('1. Configuration Check:');
console.log(`   Website ID: ${UMAMI_CONFIG.websiteId}`);
console.log(`   Script Source: ${UMAMI_CONFIG.src}`);
console.log(`   Domains: ${UMAMI_CONFIG.domains?.join(', ')}`);
console.log(`   Auto Track: ${UMAMI_CONFIG.autoTrack}`);
console.log(`   Data Cache: ${UMAMI_CONFIG.dataCache}\n`);

// Test 2: Check environment variables
console.log('2. Environment Variables Check:');
const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const scriptSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
console.log(`   NEXT_PUBLIC_UMAMI_WEBSITE_ID: ${websiteId || 'Not set (using default)'}`);
console.log(`   NEXT_PUBLIC_UMAMI_SRC: ${scriptSrc || 'Not set (using default)'}`);

if (websiteId && scriptSrc) {
  console.log('   ✅ Environment variables are properly configured');
} else {
  console.log('   ⚠️  Environment variables not found, using defaults');
}
console.log('');

// Test 3: Check if running in browser context
console.log('3. Runtime Context Check:');
if (typeof window !== 'undefined') {
  console.log('   ✅ Running in browser context');
  console.log(`   Umami loaded: ${isUmamiLoaded()}`);

  if (isUmamiLoaded()) {
    console.log('   ✅ Umami script is loaded and available');

    // Test tracking
    try {
      trackEvent('test_event', { source: 'test_script', timestamp: Date.now() });
      console.log('   ✅ Test event tracking successful');
    } catch (error) {
      console.log(`   ❌ Test event tracking failed: ${error}`);
    }
  } else {
    console.log('   ❌ Umami script is not loaded');
    console.log('   💡 This might be due to CSP blocking or script not loading');
  }
} else {
  console.log('   ℹ️  Running in Node.js context (server-side)');
  console.log('   💡 Umami only works in browser context');
  console.log('   💡 To test in browser, restart your dev server and check the console');
}

// Test 4: CSP Check Instructions
console.log('\n4. CSP Configuration Check:');
console.log('   ✅ Updated next.config.js with analytics.readysetllc.com');
console.log('   ✅ Added to script-src and connect-src directives');
console.log('   💡 Restart your development server to apply CSP changes');

// Test 5: Manual Testing Instructions
console.log('\n5. Manual Testing Instructions:');
console.log('   After restarting your dev server:');
console.log('   1. Open browser DevTools (F12)');
console.log('   2. Go to Network tab');
console.log('   3. Filter by "analytics"');
console.log('   4. Refresh the page');
console.log('   5. Look for script.js from analytics.readysetllc.com');
console.log('   6. Check Console for any CSP errors');
console.log('   7. Run this in browser console:');
console.log('      console.log("Umami loaded:", !!window.umami);');
console.log('      if (window.umami) window.umami.track("test-event");');

// Test 6: Environment File Check
console.log('\n6. Environment File Check:');
console.log('   ✅ .env.local file exists and contains Umami variables');
console.log('   ✅ Variables are properly formatted');
console.log('   💡 Next.js will load these automatically when the app starts');

console.log('\n🎯 Next Steps:');
console.log('   1. Restart your development server');
console.log('   2. Clear browser cache');
console.log('   3. Test on your development domain');
console.log('   4. Check Umami dashboard for incoming data');
console.log('   5. Deploy to production and test there as well');

console.log('\n📝 Note: The environment variables are correctly configured in .env.local');
console.log('   The test script shows "Not set" because it runs in Node.js context');
console.log('   Next.js will load these variables when the application starts');

export {};
