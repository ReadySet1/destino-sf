// src/scripts/check-square-environment.ts

interface SquareConfig {
  environment: 'sandbox' | 'production';
  token: string;
  tokenSource: string;
  applicationId?: string;
  locationId?: string;
  isValid: boolean;
}

function checkSquareEnvironment(): SquareConfig {
  console.log('🔍 Checking Square API Configuration...\n');
  
  // Environment variables
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
    SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_PRODUCTION_TOKEN: process.env.SQUARE_PRODUCTION_TOKEN,
    SQUARE_SANDBOX_TOKEN: process.env.SQUARE_SANDBOX_TOKEN,
    SQUARE_SANDBOX_APPLICATION_ID: process.env.SQUARE_SANDBOX_APPLICATION_ID,
    SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
  };

  console.log('Environment Variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    const displayValue = value ? 
      (key.includes('TOKEN') ? `${value.substring(0, 8)}...` : value) : 
      'NOT SET';
    console.log(`  ${key}: ${displayValue}`);
  });

  console.log('\n📋 Token Analysis:');
  
  // Analyze tokens
  const tokens = {
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_PRODUCTION_TOKEN: process.env.SQUARE_PRODUCTION_TOKEN,
    SQUARE_SANDBOX_TOKEN: process.env.SQUARE_SANDBOX_TOKEN,
  };

  Object.entries(tokens).forEach(([name, token]) => {
    if (token) {
      // Square sandbox tokens typically start with 'EAAA' and are shorter
      // Production tokens also start with 'EAAA' but have different characteristics
      const isSandbox = token.length < 100; // Rough heuristic
      console.log(`  ${name}: ${isSandbox ? '🧪 SANDBOX' : '🏭 PRODUCTION'} (${token.length} chars)`);
    } else {
      console.log(`  ${name}: ❌ NOT SET`);
    }
  });

  // Determine configuration
  let config: SquareConfig;
  
  // Check SQUARE_ENVIRONMENT first
  if (process.env.SQUARE_ENVIRONMENT === 'sandbox') {
    config = {
      environment: 'sandbox',
      token: process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_SANDBOX_TOKEN || '',
      tokenSource: process.env.SQUARE_ACCESS_TOKEN ? 'SQUARE_ACCESS_TOKEN' : 'SQUARE_SANDBOX_TOKEN',
      applicationId: process.env.SQUARE_SANDBOX_APPLICATION_ID,
      locationId: process.env.SQUARE_LOCATION_ID,
      isValid: false
    };
  } else {
    // Production environment
    config = {
      environment: 'production',
      token: process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN || '',
      tokenSource: process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN',
      locationId: process.env.SQUARE_LOCATION_ID,
      isValid: false
    };
  }

  config.isValid = !!config.token;

  console.log('\n🎯 Recommended Configuration:');
  console.log(`  Environment: ${config.environment.toUpperCase()}`);
  console.log(`  Token Source: ${config.tokenSource}`);
  console.log(`  Token Valid: ${config.isValid ? '✅' : '❌'}`);
  
  if (!config.isValid) {
    console.log('\n❌ ISSUES FOUND:');
    console.log('  - No valid token found for the selected environment');
    console.log('\n💡 SOLUTIONS:');
    
    if (config.environment === 'sandbox') {
      console.log('  1. Set SQUARE_ENVIRONMENT=production to use production tokens');
      console.log('  2. Or get a valid sandbox token and set SQUARE_SANDBOX_TOKEN');
    } else {
      console.log('  1. Get a valid production token from Square Dashboard');
      console.log('  2. Set SQUARE_PRODUCTION_TOKEN with the production token');
      console.log('  3. Or set SQUARE_ENVIRONMENT=sandbox for development');
    }
  }

  return config;
}

// Test the current configuration
async function testSquareConnection(config: SquareConfig): Promise<boolean> {
  if (!config.isValid) {
    console.log('\n❌ Cannot test connection - invalid configuration');
    return false;
  }

  console.log('\n🔗 Testing Square API Connection...');
  
  try {
    const Square = require('square');
    
    const client = new Square.SquareClient({
      token: config.token,
      environment: config.environment
    });

    // Test with locations API
    const locationsResponse = await client.locationsApi.listLocations();
    
    if (locationsResponse.result.locations && locationsResponse.result.locations.length > 0) {
      console.log('✅ Connection successful!');
      console.log(`   Found ${locationsResponse.result.locations.length} location(s)`);
      
      locationsResponse.result.locations.forEach((location: any, index: number) => {
        console.log(`   ${index + 1}. ${location.name} (${location.id})`);
      });
      
      return true;
    } else {
      console.log('⚠️  Connection successful but no locations found');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('UNAUTHORIZED')) {
      console.log('   This usually means:');
      console.log('   - Your token is invalid or expired');
      console.log('   - Your token is for a different environment (sandbox vs production)');
      console.log('   - Your token doesn\'t have the required permissions');
    }
    
    return false;
  }
}

// Main execution
async function main() {
  const config = checkSquareEnvironment();
  await testSquareConnection(config);
  
  console.log('\n📝 Next Steps:');
  if (!config.isValid) {
    console.log('1. Fix the token configuration issues above');
    console.log('2. Restart your development server');
    console.log('3. Run this script again to verify');
  } else {
    console.log('1. Your configuration looks good');
    console.log('2. If you\'re still having issues, check your application permissions in Square Dashboard');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkSquareEnvironment, testSquareConnection };