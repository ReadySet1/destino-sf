#!/usr/bin/env tsx

/**
 * Environment Validation Script
 * 
 * Validates environment configuration for specific requirements.
 * Usage: pnpm env:validate [options]
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { environmentDetection } from '../lib/env-check';
import { logger } from '../utils/logger';

interface ValidationOptions {
  requireDatabase?: boolean;
  requireSquare?: boolean;
  requireRedis?: boolean;
  requireShippo?: boolean;
  exitOnError?: boolean;
  verbose?: boolean;
}

function parseArgs(): ValidationOptions {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    requireDatabase: true,
    requireSquare: true,
    requireRedis: false,
    requireShippo: false,
    exitOnError: true,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--require-database':
        options.requireDatabase = true;
        break;
      case '--no-require-database':
        options.requireDatabase = false;
        break;
      case '--require-square':
        options.requireSquare = true;
        break;
      case '--no-require-square':
        options.requireSquare = false;
        break;
      case '--require-redis':
        options.requireRedis = true;
        break;
      case '--require-shippo':
        options.requireShippo = true;
        break;
      case '--no-exit':
        options.exitOnError = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Environment Validation Script

Usage: pnpm env:validate [options]

Options:
  --require-database      Require database connection (default: true)
  --no-require-database   Don't require database connection
  --require-square        Require Square integration (default: true)
  --no-require-square     Don't require Square integration
  --require-redis         Require Redis connection (default: false)
  --require-shippo        Require Shippo integration (default: false)
  --no-exit              Don't exit with error code on validation failure
  --verbose              Show detailed validation information
  --help                 Show this help message

Examples:
  pnpm env:validate
  pnpm env:validate --require-redis --require-shippo
  pnpm env:validate --no-require-square --verbose
`);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

async function main() {
  try {
    const options = parseArgs();
    
    console.log('🔍 Validating environment configuration...\n');
    
    if (options.verbose) {
      console.log('Validation requirements:');
      console.log(`  Database: ${options.requireDatabase ? 'Required' : 'Optional'}`);
      console.log(`  Square:   ${options.requireSquare ? 'Required' : 'Optional'}`);
      console.log(`  Redis:    ${options.requireRedis ? 'Required' : 'Optional'}`);
      console.log(`  Shippo:   ${options.requireShippo ? 'Required' : 'Optional'}`);
      console.log();
    }
    
    // Perform validation
    const validation = environmentDetection.validate({
      requireDatabase: options.requireDatabase,
      requireSquare: options.requireSquare,
      requireRedis: options.requireRedis,
      requireShippo: options.requireShippo,
    });
    
    // Show results
    if (validation.isValid) {
      console.log('✅ Environment validation passed');
      
      if (validation.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        validation.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
      
      if (options.verbose) {
        // Show additional environment details
        const env = environmentDetection.detect();
        
        console.log('\n📊 Environment Summary:');
        console.log(`   App:      ${env.app}`);
        console.log(`   Database: ${env.database}`);
        console.log(`   Square:   ${env.square}`);
        
        console.log('\n🔗 Service Status:');
        console.log(`   Database: ${env.connections.hasLocalDocker || env.connections.hasSupabaseCloud ? '✅' : '❌'}`);
        console.log(`   Square:   ${env.connections.hasSquareSandbox || env.connections.hasSquareProduction ? '✅' : '❌'}`);
        console.log(`   Redis:    ${env.connections.hasRedis ? '✅' : '❌'}`);
        console.log(`   Shippo:   ${env.connections.hasShippo ? '✅' : '❌'}`);
      }
      
    } else {
      console.log('❌ Environment validation failed');
      
      if (validation.errors.length > 0) {
        console.log('\n🚨 Errors:');
        validation.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }
      
      if (validation.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        validation.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
      
      console.log('\n💡 Suggested fixes:');
      
      if (options.requireDatabase && validation.errors.some(e => e.includes('Database'))) {
        console.log('   • Set up DATABASE_URL environment variable');
        console.log('   • For local: Use Docker or local PostgreSQL');
        console.log('   • For cloud: Configure Supabase connection');
      }
      
      if (options.requireSquare && validation.errors.some(e => e.includes('Square'))) {
        console.log('   • Set SQUARE_ACCESS_TOKEN or SQUARE_SANDBOX_TOKEN');
        console.log('   • Configure SQUARE_ENVIRONMENT (sandbox/production)');
      }
      
      if (options.requireRedis && validation.errors.some(e => e.includes('Redis'))) {
        console.log('   • Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
      }
      
      if (options.requireShippo && validation.errors.some(e => e.includes('Shippo'))) {
        console.log('   • Set SHIPPO_API_KEY environment variable');
      }
    }
    
    console.log();
    
    // Exit with appropriate code
    if (options.exitOnError && !validation.isValid) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    logger.error('Environment validation failed:', error);
    console.log('\n❌ Validation script failed');
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    
    if (options?.exitOnError !== false) {
      process.exit(1);
    }
  }
}

// ES module entry point check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}