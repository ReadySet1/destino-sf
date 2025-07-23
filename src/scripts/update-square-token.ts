#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { directCatalogApi } from '../lib/square/catalog-api';
import { logger } from '../utils/logger';

/**
 * Script to update Square API tokens and test connectivity
 * Run with: npm run script -- src/scripts/update-square-token.ts
 */
async function updateSquareToken(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    // Parse command line arguments
    let tokenType = 'production';
    let tokenValue: string | null = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--sandbox' || args[i] === '-s') {
        tokenType = 'sandbox';
      } else if (args[i] === '--production' || args[i] === '-p') {
        tokenType = 'production';
      } else if (args[i] === '--token' || args[i] === '-t') {
        tokenValue = args[i + 1] || null;
        i++; // Skip the next argument
      }
    }

    if (!tokenValue) {
      logger.info('\nSquare API Token Updater');
      logger.info('------------------------');
      logger.info('Usage:');
      logger.info('  npm run script -- src/scripts/update-square-token.ts [options]');
      logger.info('Options:');
      logger.info('  --sandbox, -s    Update the sandbox token');
      logger.info('  --production, -p Update the production token (default)');
      logger.info('  --token, -t      The new token value');
      logger.info('\nExample:');
      logger.info(
        '  npm run script -- src/scripts/update-square-token.ts --production --token EAAAEExxxxx'
      );
      return;
    }

    // Determine which env var to update
    const envVarName = tokenType === 'sandbox' ? 'SQUARE_SANDBOX_TOKEN' : 'SQUARE_PRODUCTION_TOKEN';

    const envVarAlias = tokenType === 'sandbox' ? 'SQUARE_SANDBOX_TOKEN' : 'SQUARE_ACCESS_TOKEN'; // For production, also update SQUARE_ACCESS_TOKEN

    // Temporarily set the environment variable for testing
    const originalValue = process.env[envVarName];
    process.env[envVarName] = tokenValue;

    if (tokenType === 'production') {
      process.env.SQUARE_ACCESS_TOKEN = tokenValue;
      process.env.USE_SQUARE_SANDBOX = 'false';
    } else {
      process.env.USE_SQUARE_SANDBOX = 'true';
    }

    // Test the token
    logger.info(`Testing ${tokenType} token...`);

    const result = await directCatalogApi.testConnection();

    if (result.success) {
      logger.info(`✅ Token test successful for ${tokenType} environment!`);

      // Update the .env.local file
      const envFilePath = path.resolve(process.cwd(), '.env.local');

      // Read existing env file or create new one
      let envFileContent = '';
      try {
        envFileContent = fs.readFileSync(envFilePath, 'utf8');
      } catch (err) {
        // File doesn't exist, will create it
      }

      // Update or add the env var
      const envVarRegex = new RegExp(`^${envVarName}=.*$`, 'm');

      if (envFileContent.match(envVarRegex)) {
        // Update existing var
        envFileContent = envFileContent.replace(envVarRegex, `${envVarName}=${tokenValue}`);
      } else {
        // Add new var
        envFileContent += `\n${envVarName}=${tokenValue}`;
      }

      // For production token, also update SQUARE_ACCESS_TOKEN
      if (tokenType === 'production') {
        const accessTokenRegex = /^SQUARE_ACCESS_TOKEN=.*$/m;

        if (envFileContent.match(accessTokenRegex)) {
          envFileContent = envFileContent.replace(
            accessTokenRegex,
            `SQUARE_ACCESS_TOKEN=${tokenValue}`
          );
        } else {
          envFileContent += `\nSQUARE_ACCESS_TOKEN=${tokenValue}`;
        }
      }

      // Make sure USE_SQUARE_SANDBOX is set correctly
      const sandboxFlagRegex = /^USE_SQUARE_SANDBOX=.*$/m;
      const sandboxValue = tokenType === 'sandbox' ? 'true' : 'false';

      if (envFileContent.match(sandboxFlagRegex)) {
        envFileContent = envFileContent.replace(
          sandboxFlagRegex,
          `USE_SQUARE_SANDBOX=${sandboxValue}`
        );
      } else {
        envFileContent += `\nUSE_SQUARE_SANDBOX=${sandboxValue}`;
      }

      // Write back to file
      fs.writeFileSync(envFilePath, envFileContent.trim() + '\n');

      logger.info(`✅ Updated ${envVarName} in .env.local file`);

      // Recommend restarting the dev server
      logger.info('\n🔄 Please restart your development server for changes to take effect.');
    } else {
      logger.error(`❌ Token test failed for ${tokenType} environment.`);
      logger.error(`Error: ${result.error}`);

      // Restore original value
      process.env[envVarName] = originalValue;
    }
  } catch (error) {
    logger.error('Error during token update:', error);
  }
}

// Run the function
updateSquareToken()
  .then(() => {
    logger.info('Script completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Unhandled error in script:', error);
    process.exit(1);
  });
