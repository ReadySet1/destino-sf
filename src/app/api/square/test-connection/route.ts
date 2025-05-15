import { NextRequest, NextResponse } from 'next/server';
import { directCatalogApi } from '@/lib/square/catalog-api';
import { logger } from '@/utils/logger';
import https from 'https';

/**
 * Tests DNS resolution for a domain
 * @param domain Domain to test
 * @returns Whether the domain resolves
 */
async function testDnsResolution(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000 // 5-second timeout
    }, () => {
      // Successfully connected
      resolve(true);
    });
    
    req.on('error', () => {
      // Error connecting
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * API endpoint to test Square API connectivity
 * This helps diagnose authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    // Get request parameters to toggle between sandbox and production
    const searchParams = request.nextUrl.searchParams;
    const forceSandbox = searchParams.get('sandbox') === 'true';
    const forceProduction = searchParams.get('production') === 'true';
    const tempToken = searchParams.get('token');
    
    // Save the original environment settings
    const originalSandboxSetting = process.env.USE_SQUARE_SANDBOX;
    const originalSandboxToken = process.env.SQUARE_SANDBOX_TOKEN;
    const originalProductionToken = process.env.SQUARE_PRODUCTION_TOKEN;
    const originalAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    
    try {
      // Set environment based on request parameters
      if (forceSandbox) {
        process.env.USE_SQUARE_SANDBOX = 'true';
        logger.info('Testing with sandbox environment');
      } else if (forceProduction) {
        process.env.USE_SQUARE_SANDBOX = 'false';
        logger.info('Testing with production environment');
      }
      
      // Apply temporary token if provided
      if (tempToken) {
        logger.info('Using temporary token for this request');
        
        if (forceSandbox || (!forceProduction && process.env.USE_SQUARE_SANDBOX === 'true')) {
          logger.info('Applying temporary token to sandbox environment');
          process.env.SQUARE_SANDBOX_TOKEN = tempToken;
        } else {
          logger.info('Applying temporary token to production environment');
          process.env.SQUARE_ACCESS_TOKEN = tempToken;
          process.env.SQUARE_PRODUCTION_TOKEN = tempToken;
        }
      }
      
      // Check DNS resolution first for relevant domain
      const domainToTest = (forceSandbox || (!forceProduction && process.env.USE_SQUARE_SANDBOX === 'true')) 
        ? 'sandbox.squareup.com' 
        : 'connect.squareup.com';
        
      const dnsResolved = await testDnsResolution(domainToTest);
      
      if (!dnsResolved) {
        logger.error(`DNS resolution failed for ${domainToTest}`);
        return NextResponse.json({
          success: false,
          error: `DNS resolution failed for ${domainToTest}. Please check your network connection.`,
          dnsTest: { domain: domainToTest, resolved: false }
        }, { status: 500 });
      }
      
      // Test the connection
      const result = await directCatalogApi.testConnection();
      
      // Add environment variable information
      const environmentInfo = {
        SQUARE_SANDBOX_TOKEN: !!originalSandboxToken,
        SQUARE_PRODUCTION_TOKEN: !!originalProductionToken,
        SQUARE_ACCESS_TOKEN: !!originalAccessToken,
        USE_SQUARE_SANDBOX: originalSandboxSetting,
        NODE_ENV: process.env.NODE_ENV,
        USED_TEMP_TOKEN: !!tempToken,
        DNS_TEST: { domain: domainToTest, resolved: dnsResolved }
      };
      
      return NextResponse.json({
        ...result,
        environmentVariables: environmentInfo
      });
    } finally {
      // Always restore original environment settings
      process.env.USE_SQUARE_SANDBOX = originalSandboxSetting;
      process.env.SQUARE_SANDBOX_TOKEN = originalSandboxToken;
      process.env.SQUARE_PRODUCTION_TOKEN = originalProductionToken;
      process.env.SQUARE_ACCESS_TOKEN = originalAccessToken;
    }
  } catch (error) {
    logger.error('Error testing Square API connection:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 