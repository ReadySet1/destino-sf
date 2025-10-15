#!/usr/bin/env tsx
/**
 * Square Token Setup and Testing Utility
 *
 * This script helps setup and test Square API tokens for the hybrid configuration
 * where catalog operations use production and transactions use sandbox.
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

interface TokenTestResult {
  tokenName: string;
  isConfigured: boolean;
  tokenLength: number;
  environment: 'production' | 'sandbox';
  apiEndpoint: string;
  isValid?: boolean;
  error?: string;
}

class SquareTokenSetup {
  private envFilePath = '.env.local';
  private envBackupPath = '.env.local.backup';

  async run() {
    console.log('🔧 Square Token Setup & Testing Utility\n');

    // Step 1: Check current configuration
    console.log('📋 Current Configuration:');
    await this.checkCurrentConfig();

    // Step 2: Test token validity
    console.log('\n🧪 Testing Token Validity:');
    await this.testAllTokens();

    // Step 3: Provide recommendations
    console.log('\n💡 Recommendations:');
    await this.provideRecommendations();

    console.log('\n✅ Setup check complete!');
  }

  private async checkCurrentConfig() {
    const config = {
      // Environment Control
      USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
      SQUARE_CATALOG_USE_PRODUCTION: process.env.SQUARE_CATALOG_USE_PRODUCTION,
      SQUARE_TRANSACTIONS_USE_SANDBOX: process.env.SQUARE_TRANSACTIONS_USE_SANDBOX,

      // Tokens (show length only for security)
      SQUARE_PRODUCTION_TOKEN: this.getTokenInfo('SQUARE_PRODUCTION_TOKEN'),
      SQUARE_SANDBOX_TOKEN: this.getTokenInfo('SQUARE_SANDBOX_TOKEN'),
      SQUARE_ACCESS_TOKEN: this.getTokenInfo('SQUARE_ACCESS_TOKEN'),

      // Other configs
      SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID ? '✅ Configured' : '❌ Missing',
      SQUARE_WEBHOOK_SECRET: process.env.SQUARE_WEBHOOK_SECRET ? '✅ Configured' : '❌ Missing',
      SQUARE_WEBHOOK_SECRET_SANDBOX: process.env.SQUARE_WEBHOOK_SECRET_SANDBOX
        ? '✅ Configured'
        : '❌ Missing',
    };

    console.table(config);
  }

  private getTokenInfo(tokenName: string): string {
    const token = process.env[tokenName];
    if (!token) return '❌ Missing';
    if (token.length < 20) return '⚠️ Too short (invalid?)';
    return `✅ Configured (${token.length} chars)`;
  }

  private async testAllTokens() {
    const tests: TokenTestResult[] = [
      {
        tokenName: 'SQUARE_PRODUCTION_TOKEN',
        isConfigured: !!process.env.SQUARE_PRODUCTION_TOKEN,
        tokenLength: process.env.SQUARE_PRODUCTION_TOKEN?.length || 0,
        environment: 'production',
        apiEndpoint: 'connect.squareup.com',
      },
      {
        tokenName: 'SQUARE_SANDBOX_TOKEN',
        isConfigured: !!process.env.SQUARE_SANDBOX_TOKEN,
        tokenLength: process.env.SQUARE_SANDBOX_TOKEN?.length || 0,
        environment: 'sandbox',
        apiEndpoint: 'connect.squareupsandbox.com',
      },
      {
        tokenName: 'SQUARE_ACCESS_TOKEN',
        isConfigured: !!process.env.SQUARE_ACCESS_TOKEN,
        tokenLength: process.env.SQUARE_ACCESS_TOKEN?.length || 0,
        environment: 'production',
        apiEndpoint: 'connect.squareup.com',
      },
    ];

    // Test each token
    for (const test of tests) {
      if (test.isConfigured) {
        try {
          const isValid = await this.testTokenConnection(
            process.env[test.tokenName]!,
            test.environment
          );
          test.isValid = isValid;
          if (isValid) {
            console.log(`✅ ${test.tokenName}: Valid`);
          } else {
            console.log(`❌ ${test.tokenName}: Invalid/Expired`);
          }
        } catch (error) {
          test.error = error instanceof Error ? error.message : String(error);
          console.log(`❌ ${test.tokenName}: Error - ${test.error}`);
        }
      } else {
        console.log(`⚠️ ${test.tokenName}: Not configured`);
      }
    }
  }

  private async testTokenConnection(
    token: string,
    environment: 'production' | 'sandbox'
  ): Promise<boolean> {
    const apiHost =
      environment === 'sandbox' ? 'connect.squareupsandbox.com' : 'connect.squareup.com';

    try {
      const response = await fetch(`https://${apiHost}/v2/locations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Square-Version': '2024-05-15',
          'Content-Type': 'application/json',
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error(`Error testing ${environment} token:`, error);
      return false;
    }
  }

  private async provideRecommendations() {
    const hasProductionToken = !!process.env.SQUARE_PRODUCTION_TOKEN;
    const hasSandboxToken = !!process.env.SQUARE_SANDBOX_TOKEN;
    const hasAccessToken = !!process.env.SQUARE_ACCESS_TOKEN;
    const hasLocationId = !!process.env.SQUARE_LOCATION_ID;

    // Check hybrid configuration
    const catalogProduction = process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
    const transactionsSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';

    console.log('\n🎯 Configuration Analysis:');

    if (catalogProduction && transactionsSandbox) {
      console.log('✅ Hybrid mode configured (recommended for development)');

      if (!hasProductionToken && !hasAccessToken) {
        console.log('❌ Missing production token for catalog operations');
        console.log('   → Add SQUARE_PRODUCTION_TOKEN to .env.local');
      }

      if (!hasSandboxToken) {
        console.log('❌ Missing sandbox token for transaction testing');
        console.log('   → Add SQUARE_SANDBOX_TOKEN to .env.local');
      }
    } else if (!catalogProduction && !transactionsSandbox) {
      console.log('⚠️ Full production mode - be careful with transactions!');
    } else if (catalogProduction && !transactionsSandbox) {
      console.log('🚨 Mixed production mode - both catalog and transactions use production');
    } else {
      console.log('🧪 Full sandbox mode');
    }

    if (!hasLocationId) {
      console.log('❌ Missing SQUARE_LOCATION_ID');
      console.log('   → Get this from Square Dashboard > Locations');
    }

    console.log('\n📝 Quick Fix Commands:');
    console.log('# Test current setup:');
    console.log('curl http://localhost:3000/api/debug/square-config');
    console.log('');
    console.log('# Reset client if needed:');
    console.log('curl -X POST http://localhost:3000/api/debug/reset-square-client');
  }

  async createTemplateEnvFile() {
    const template = `# === SQUARE HYBRID CONFIGURATION ===
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# === PRODUCTION TOKENS (for catalog operations) ===
SQUARE_PRODUCTION_TOKEN=your_production_token_here
SQUARE_LOCATION_ID=your_location_id_here

# === SANDBOX TOKENS (for transaction testing) ===
SQUARE_SANDBOX_TOKEN=your_sandbox_token_here
SQUARE_SANDBOX_APPLICATION_ID=your_sandbox_app_id_here

# === WEBHOOK CONFIGURATION ===
SQUARE_WEBHOOK_SECRET=your_webhook_secret_production
SQUARE_WEBHOOK_SECRET_SANDBOX=your_webhook_secret_sandbox

# === LEGACY SUPPORT ===
SQUARE_ACCESS_TOKEN=your_production_token_here
USE_SQUARE_SANDBOX=false

# === OTHER ENVIRONMENT VARIABLES ===
# Add your other environment variables here...
`;

    const templatePath = '.env.template';
    writeFileSync(templatePath, template);
    console.log(`📄 Created template file: ${templatePath}`);
    console.log('Copy this to .env.local and fill in your actual tokens');
  }
}

// Run the setup if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const setup = new SquareTokenSetup();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--create-template')) {
    setup.createTemplateEnvFile();
  } else {
    setup.run().catch(console.error);
  }
}

export { SquareTokenSetup };
