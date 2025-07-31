#!/usr/bin/env tsx

/**
 * Database Status Check Script
 * 
 * Checks database connection health and displays status information.
 * Usage: pnpm db:status
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { adaptiveDatabase, checkDatabaseHealth } from '../lib/db-adaptive';
import { environmentDetection } from '../lib/env-check';
import { logger } from '../utils/logger';

async function main() {
  console.log('🔍 Database Status Check\n');
  
  try {
    // Get current environment
    const environment = environmentDetection.detect();
    
    console.log('📊 Current Environment:');
    console.log(`   App:        ${environment.app}`);
    console.log(`   Database:   ${environment.database}`);
    console.log(`   Provider:   ${environment.config.databaseProvider}`);
    console.log();
    
    // Check database health
    console.log('🏥 Health Check...');
    const health = await checkDatabaseHealth(true);
    
    if (health.isHealthy) {
      console.log('✅ Database connection is healthy');
      console.log(`   Response time: ${health.responseTime}ms`);
      console.log(`   Host: ${health.metadata.host}`);
      console.log(`   Database: ${health.metadata.database}`);
      if (health.metadata.version) {
        console.log(`   Version: ${health.metadata.version}`);
      }
      if (health.metadata.connection_count !== undefined) {
        console.log(`   Active connections: ${health.metadata.connection_count}`);
      }
    } else {
      console.log('❌ Database connection failed');
      health.errors.forEach(error => {
        console.log(`   Error: ${error}`);
      });
    }
    
    if (health.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      health.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log();
    
    // Get database statistics
    console.log('📈 Database Statistics:');
    const stats = await adaptiveDatabase.getConnectionStats();
    
    console.log(`   Current environment: ${stats.current}`);
    console.log(`   Available environments: ${stats.available.join(', ')}`);
    
    if (stats.config) {
      console.log(`   Max connections: ${stats.config.maxConnections}`);
      console.log(`   Connection timeout: ${stats.config.connectionTimeout}ms`);
      console.log(`   SSL enabled: ${stats.config.ssl}`);
    }
    
    console.log();
    
    // Available actions
    console.log('🛠️  Available Actions:');
    console.log('   pnpm env:check         - Full environment check');
    console.log('   pnpm db:local          - Switch to local database');
    console.log('   pnpm db:cloud          - Switch to cloud database');
    
    if (stats.available.length > 1) {
      console.log('   Environment switching available:');
      stats.available.forEach(env => {
        if (env !== stats.current) {
          console.log(`     • Switch to ${env}`);
        }
      });
    }
    
    // Exit with appropriate code
    process.exit(health.isHealthy ? 0 : 1);
    
  } catch (error) {
    logger.error('Database status check failed:', error);
    console.log('\n❌ Database status check failed');
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    
    console.log('\n💡 Troubleshooting:');
    console.log('   • Check your DATABASE_URL environment variable');
    console.log('   • Ensure database server is running');
    console.log('   • Run: pnpm env:check for full diagnosis');
    
    process.exit(1);
  }
}

// ES module entry point check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}