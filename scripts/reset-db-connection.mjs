#!/usr/bin/env node

/**
 * Script to force reset database connection to clear cached query plans
 *
 * This resolves PostgreSQL "cached plan must not change result type" errors
 * that can occur after schema changes.
 *
 * Usage: node scripts/reset-db-connection.mjs
 */

import { forceResetConnection, getHealthStatus } from '../src/lib/db-unified.js';

async function main() {
  console.log('🔄 Starting database connection reset...');

  try {
    // Reset the database connection to clear cached plans
    await forceResetConnection();

    // Test the connection
    console.log('🧪 Testing database connection...');
    const health = await getHealthStatus();

    if (health.connected) {
      console.log('✅ Database connection reset successful!');
      console.log(`📊 Connection latency: ${health.latency}ms`);
      if (health.error) {
        console.log(`⚠️  Warning: ${health.error}`);
      }
    } else {
      console.error('❌ Database connection test failed:', health.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error resetting database connection:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
