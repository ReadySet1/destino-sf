/**
 * Test script for Share Platters Direct Fix
 *
 * This script demonstrates how to use the direct fix for Share Platter variants.
 * Run this in your browser console or create a button to trigger it.
 */

async function testSharePlattersFix() {
  try {
    console.log('🎯 Testing Share Platters Direct Fix...');

    const response = await fetch('/api/square/unified-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fixSharePlatters: true,
      }),
    });

    const result = await response.json();

    console.log('🎯 Share Platters Fix Result:', result);

    if (result.success) {
      console.log(`✅ Success! Fixed ${result.data.fixedCount} Share Platter items`);
      console.log(`📝 Message: ${result.message}`);
    } else {
      console.error('❌ Fix failed:', result.message);
    }

    return result;
  } catch (error) {
    console.error('❌ Error running Share Platters fix:', error);
    return { success: false, error: error.message };
  }
}

// For testing in browser console:
// testSharePlattersFix();

// Example HTML button:
/*
<button onclick="testSharePlattersFix()" class="btn btn-primary">
  🎯 Fix Share Platters
</button>
*/

// Example fetch with more options:
async function runSharePlattersFixWithOptions() {
  const response = await fetch('/api/square/unified-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add auth headers if needed
    },
    body: JSON.stringify({
      fixSharePlatters: true,
      // You can also combine with other options:
      // dryRun: false,
      // forceUpdate: true
    }),
  });

  return await response.json();
}

console.log('🎯 Share Platters Direct Fix test script loaded');
console.log('   Run: testSharePlattersFix()');
