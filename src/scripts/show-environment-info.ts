#!/usr/bin/env tsx

/**
 * Show Environment Info Script
 * 
 * Displays detailed environment information in JSON format for debugging.
 * Usage: pnpm env:info
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { environmentDetection } from '../lib/env-check';
import { logger } from '../utils/logger';

interface ShowInfoOptions {
  /** Include sensitive information (development only) */
  includeSensitive?: boolean;
  /** Format output as JSON */
  json?: boolean;
  /** Show only specific sections */
  sections?: string[];
}

function parseArgs(): ShowInfoOptions {
  const args = process.argv.slice(2);
  const options: ShowInfoOptions = {
    includeSensitive: false,
    json: true,
    sections: [],
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--sensitive':
        options.includeSensitive = true;
        break;
      case '--pretty':
        options.json = false;
        break;
      case '--sections':
        const sectionsArg = args[i + 1];
        if (sectionsArg) {
          options.sections = sectionsArg.split(',');
          i++;
        }
        break;
      case '--help':
        console.log(`
Environment Info Script

Usage: pnpm env:info [options]

Options:
  --sensitive       Include sensitive information (dev only)
  --pretty          Pretty-print instead of JSON
  --sections <list> Show only specific sections (comma-separated)
                    Available: environments,features,connections,config,validation
  --help            Show this help message

Examples:
  pnpm env:info
  pnpm env:info --sensitive
  pnpm env:info --sections environments,connections
  pnpm env:info --pretty
`);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function filterSections(info: any, sections: string[]): any {
  if (sections.length === 0) return info;
  
  const filtered: any = {};
  sections.forEach(section => {
    if (info[section]) {
      filtered[section] = info[section];
    }
  });
  
  return filtered;
}

function prettyPrint(info: any) {
  console.log('🔍 Environment Information\n');
  
  if (info.error) {
    console.log('❌ Error:', info.error);
    return;
  }
  
  // Environments
  if (info.environments) {
    console.log('📱 Environments:');
    console.log(`   App:            ${info.environments.app}`);
    console.log(`   Infrastructure: ${info.environments.infrastructure}`);
    console.log(`   Database:       ${info.environments.database}`);
    console.log(`   Square:         ${info.environments.square}`);
    console.log();
  }
  
  // Features
  if (info.features) {
    console.log('🎛️  Feature Flags:');
    Object.entries(info.features).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${key}: ${emoji}`);
    });
    console.log();
  }
  
  // Connections
  if (info.connections) {
    console.log('🔗 Service Connections:');
    Object.entries(info.connections).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${key}: ${emoji}`);
    });
    console.log();
  }
  
  // Configuration
  if (info.config) {
    console.log('⚙️  Configuration:');
    Object.entries(info.config).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log();
  }
  
  // Validation
  if (info.validation) {
    console.log('✅ Validation:');
    console.log(`   Valid: ${info.validation.isValid ? '✅' : '❌'}`);
    
    if (info.validation.errors?.length > 0) {
      console.log('   Errors:');
      info.validation.errors.forEach((error: string) => {
        console.log(`     • ${error}`);
      });
    }
    
    if (info.validation.warnings?.length > 0) {
      console.log('   Warnings:');
      info.validation.warnings.forEach((warning: string) => {
        console.log(`     • ${warning}`);
      });
    }
    console.log();
  }
  
  // Sensitive information
  if (info.sensitive) {
    console.log('🔐 Sensitive Information (Development Only):');
    Object.entries(info.sensitive).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log();
  }
}

async function main() {
  try {
    const options = parseArgs();
    
    // Get environment information
    const info = environmentDetection.getInfo(options.includeSensitive);
    
    // Filter sections if requested
    const filteredInfo = filterSections(info, options.sections || []);
    
    // Output in requested format
    if (options.json) {
      console.log(JSON.stringify(filteredInfo, null, 2));
    } else {
      prettyPrint(filteredInfo);
    }
    
  } catch (error) {
    logger.error('Failed to get environment info:', error);
    
    const errorInfo = {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    
    console.log(JSON.stringify(errorInfo, null, 2));
    process.exit(1);
  }
}

// ES module entry point check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}