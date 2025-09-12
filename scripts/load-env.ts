/**
 * Environment loader for scripts
 * Ensures scripts have access to environment variables like Next.js does
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export function loadEnvironment() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = resolve(__dirname, '..');
  
  // Load environment files in the same order as Next.js
  const envFiles = [
    '.env.local',
    '.env.development', 
    '.env'
  ];

  console.log('🔧 Loading environment files...');
  
  for (const envFile of envFiles) {
    const envPath = resolve(projectRoot, envFile);
    const result = config({ path: envPath });
    
    if (!result.error) {
      console.log(`✅ Loaded: ${envFile}`);
    } else {
      console.log(`⚠️ Skipped: ${envFile} (${result.error.message})`);
    }
  }

  // Verify critical environment variables
  const criticalVars = ['DATABASE_URL'];
  const missing = criticalVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing critical environment variables: ${missing.join(', ')}`);
    console.error('Please ensure your .env.local file contains all required variables.');
    process.exit(1);
  }

  console.log('✅ Environment loaded successfully');
  return true;
}
