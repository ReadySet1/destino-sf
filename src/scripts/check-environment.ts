#!/usr/bin/env tsx

/**
 * Environment Check Script
 * 
 * Performs comprehensive environment validation and displays current status.
 * Usage: pnpm env:check
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { environmentDetection } from '../lib/env-check';
import { logger } from '../utils/logger';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printSeparator(title?: string) {
  const line = '─'.repeat(50);
  if (title) {
    const padding = Math.max(0, (50 - title.length - 2) / 2);
    const leftPad = ' '.repeat(Math.floor(padding));
    const rightPad = ' '.repeat(Math.ceil(padding));
    console.log(`${leftPad}${title}${rightPad}`);
  }
  console.log(line);
}

async function main() {
  console.log('🔍 Environment Check\n');
  
  const startTime = Date.now();
  
  try {
    // Detect environment
    console.log('📊 Analyzing environment...\n');
    const environment = environmentDetection.detect();
    
    printSeparator('ENVIRONMENT STATUS');
    
    // Basic environment info
    console.log(`App Environment:     ${environment.app.toUpperCase()}`);
    console.log(`Infrastructure:      ${environment.infra}`);
    console.log(`Database:            ${environment.database}`);
    console.log(`Square:              ${environment.square}`);
    console.log();
    
    // Feature flags
    printSeparator('FEATURE FLAGS');
    console.log(`Development Mode:    ${environment.features.isDevelopment ? '✅' : '❌'}`);
    console.log(`Production Mode:     ${environment.features.isProduction ? '✅' : '❌'}`);
    console.log(`Test Mode:           ${environment.features.isTest ? '✅' : '❌'}`);
    console.log(`Local Docker:        ${environment.features.isLocalDocker ? '✅' : '❌'}`);
    console.log(`Cloud Database:      ${environment.features.isCloudDatabase ? '✅' : '❌'}`);
    console.log(`Sandbox Square:      ${environment.features.useSandboxSquare ? '✅' : '❌'}`);
    console.log(`Debug Logging:       ${environment.features.enableDebugLogging ? '✅' : '❌'}`);
    console.log(`Hot Reload:          ${environment.features.enableHotReload ? '✅' : '❌'}`);
    console.log();
    
    // Connection status
    printSeparator('SERVICE CONNECTIONS');
    console.log(`Local Docker:        ${environment.connections.hasLocalDocker ? '✅ Available' : '❌ Not configured'}`);
    console.log(`Supabase Cloud:      ${environment.connections.hasSupabaseCloud ? '✅ Available' : '❌ Not configured'}`);
    console.log(`Square Production:   ${environment.connections.hasSquareProduction ? '✅ Available' : '❌ Not configured'}`);
    console.log(`Square Sandbox:      ${environment.connections.hasSquareSandbox ? '✅ Available' : '❌ Not configured'}`);
    console.log(`Redis (Upstash):     ${environment.connections.hasRedis ? '✅ Available' : '❌ Not configured'}`);
    console.log(`Shippo Shipping:     ${environment.connections.hasShippo ? '✅ Available' : '❌ Not configured'}`);
    console.log();
    
    // Configuration details
    printSeparator('CONFIGURATION');
    console.log(`Square API Host:     ${environment.config.squareApiHost}`);
    console.log(`Database Provider:   ${environment.config.databaseProvider}`);
    console.log(`Base URL:            ${environment.config.baseUrl}`);
    console.log(`API Version:         ${environment.config.apiVersion}`);
    console.log();
    
    // Validation results
    const validation = environmentDetection.validate({
      requireDatabase: true,
      requireSquare: true,
      requireRedis: false,
      requireShippo: false,
    });
    
    printSeparator('VALIDATION RESULTS');
    
    if (validation.isValid) {
      console.log('✅ Environment validation passed');
    } else {
      console.log('❌ Environment validation failed');
    }
    
    if (validation.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      validation.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      validation.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log();
    
    // Environment switching capabilities
    const switchingCapabilities = environmentDetection.canSwitch();
    
    printSeparator('SWITCHING CAPABILITIES');
    console.log(`Can Switch Database: ${switchingCapabilities.canSwitchDatabase ? '✅' : '❌'}`);
    if (switchingCapabilities.canSwitchDatabase) {
      console.log(`  Available: ${switchingCapabilities.availableTargets.database.join(', ')}`);
    }
    
    console.log(`Can Switch Square:   ${switchingCapabilities.canSwitchSquare ? '✅' : '❌'}`);
    if (switchingCapabilities.canSwitchSquare) {
      console.log(`  Available: ${switchingCapabilities.availableTargets.square.join(', ')}`);
    }
    
    console.log();
    
    // Recommendations
    printSeparator('RECOMMENDATIONS');
    
    if (environment.app === 'production' && environment.square === 'sandbox') {
      console.log('⚠️  Switch to Square production for live payments');
    }
    
    if (environment.app === 'development' && !environment.connections.hasLocalDocker) {
      console.log('💡 Consider setting up local Docker for faster development');
    }
    
    if (!environment.connections.hasRedis) {
      console.log('💡 Set up Redis for better caching and rate limiting');
    }
    
    if (!environment.connections.hasShippo) {
      console.log('💡 Configure Shippo for shipping functionality');
    }
    
    if (environment.features.isProduction && !validation.isValid) {
      console.log('🚨 Fix validation errors before deploying to production');
    }
    
    console.log();
    
    // Quick actions
    printSeparator('QUICK ACTIONS');
    console.log('Available commands:');
    console.log('  pnpm env:info              - Show detailed environment info');
    console.log('  pnpm env:validate          - Run validation only');
    console.log('  pnpm dev:local             - Start with local Docker');
    console.log('  pnpm dev:cloud             - Start with cloud services');
    console.log('  pnpm db:status             - Check database connection');
    
    if (switchingCapabilities.canSwitchDatabase) {
      console.log('  pnpm db:switch-local       - Switch to local database');
      console.log('  pnpm db:switch-cloud       - Switch to cloud database');
    }
    
    if (switchingCapabilities.canSwitchSquare) {
      console.log('  pnpm square:switch         - Switch Square environment');
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Environment check completed in ${formatDuration(duration)}`);
    
    // Exit with appropriate code
    process.exit(validation.isValid ? 0 : 1);
    
  } catch (error) {
    logger.error('Environment check failed:', error);
    console.log('\n❌ Environment check failed');
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// ES module entry point check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}