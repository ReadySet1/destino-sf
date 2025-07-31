#!/usr/bin/env tsx

/**
 * Square Connection Test Script
 * 
 * Tests Square API connection and displays configuration information.
 * Usage: pnpm square:sandbox or pnpm square:production
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { environmentDetection } from '../lib/env-check';
import { logger } from '../utils/logger';

interface SquareTestResult {
  isConnected: boolean;
  environment: 'sandbox' | 'production';
  applicationId?: string;
  locationId?: string;
  errors: string[];
  warnings: string[];
  apiHost: string;
}

async function testSquareConnection(): Promise<SquareTestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isConnected = false;
  let applicationId: string | undefined;
  let locationId: string | undefined;
  
  try {
    const env = environmentDetection.detect();
    const squareEnv = env.square;
    const apiHost = env.config.squareApiHost;
    
    // Check environment variables
    const accessToken = process.env.SQUARE_ACCESS_TOKEN || 
                       (squareEnv === 'sandbox' ? process.env.SQUARE_SANDBOX_TOKEN : process.env.SQUARE_PRODUCTION_TOKEN);
    
    if (!accessToken) {
      errors.push('No Square access token found');
      return {
        isConnected: false,
        environment: squareEnv,
        errors,
        warnings,
        apiHost,
      };
    }
    
    applicationId = process.env.SQUARE_APPLICATION_ID;
    locationId = process.env.SQUARE_LOCATION_ID;
    
    if (!applicationId) {
      warnings.push('SQUARE_APPLICATION_ID not set');
    }
    
    if (!locationId) {
      warnings.push('SQUARE_LOCATION_ID not set');
    }
    
    // Test API connection
    console.log(`Testing Square ${squareEnv} connection...`);
    
    const response = await fetch(`https://${apiHost}/v2/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } else {
      const data = await response.json();
      console.log(`✅ Successfully connected to Square ${squareEnv}`);
      console.log(`   Found ${data.locations?.length || 0} locations`);
      
      if (data.locations && data.locations.length > 0) {
        console.log('   Available locations:');
        data.locations.forEach((location: any) => {
          console.log(`     • ${location.name} (${location.id})`);
          if (location.id === locationId) {
            console.log('       ^ Configured location');
          }
        });
      }
      
      isConnected = true;
    }
    
    return {
      isConnected,
      environment: squareEnv,
      applicationId,
      locationId,
      errors,
      warnings,
      apiHost,
    };
    
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      isConnected: false,
      environment: 'sandbox',
      errors,
      warnings,
      apiHost: 'connect.squareupsandbox.com',
    };
  }
}

async function main() {
  console.log('🔍 Square API Connection Test\n');
  
  try {
    // Get current environment
    const environment = environmentDetection.detect();
    
    console.log('📊 Current Configuration:');
    console.log(`   App Environment:    ${environment.app}`);
    console.log(`   Square Environment: ${environment.square}`);
    console.log(`   API Host:           ${environment.config.squareApiHost}`);
    console.log();
    
    // Test connection
    const result = await testSquareConnection();
    
    console.log('📋 Connection Results:');
    console.log(`   Status:        ${result.isConnected ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   Environment:   ${result.environment}`);
    console.log(`   API Host:      ${result.apiHost}`);
    
    if (result.applicationId) {
      console.log(`   Application ID: ${result.applicationId}`);
    }
    
    if (result.locationId) {
      console.log(`   Location ID:    ${result.locationId}`);
    }
    
    console.log();
    
    // Show errors
    if (result.errors.length > 0) {
      console.log('🚨 Errors:');
      result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
      console.log();
    }
    
    // Show warnings
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
      console.log();
    }
    
    // Environment-specific advice
    if (environment.app === 'production' && result.environment === 'sandbox') {
      console.log('⚠️  Production app using Square sandbox');
      console.log('   Payments will not be processed in production');
      console.log('   Set SQUARE_ENVIRONMENT=production for live payments');
      console.log();
    }
    
    if (environment.app === 'development' && result.environment === 'production') {
      console.log('⚠️  Development app using Square production');
      console.log('   This will process real payments');
      console.log('   Consider using sandbox for development');
      console.log();
    }
    
    // Available actions
    console.log('🛠️  Available Actions:');
    console.log('   pnpm square:sandbox    - Test sandbox connection');
    console.log('   pnpm square:production - Test production connection');
    console.log('   pnpm env:check         - Full environment check');
    
    if (environment.connections.hasSquareSandbox && environment.connections.hasSquareProduction) {
      console.log('\n   Environment switching available:');
      console.log('     • Update SQUARE_ENVIRONMENT in .env.local');
      console.log('     • Or use USE_SQUARE_SANDBOX=true/false');
    }
    
    // Exit with appropriate code
    process.exit(result.isConnected ? 0 : 1);
    
  } catch (error) {
    logger.error('Square connection test failed:', error);
    console.log('\n❌ Square connection test failed');
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    
    console.log('\n💡 Troubleshooting:');
    console.log('   • Check SQUARE_ACCESS_TOKEN environment variable');
    console.log('   • Verify Square application credentials');
    console.log('   • Ensure correct Square environment (sandbox/production)');
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