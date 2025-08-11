// Quick script to run production sync for all Square products including catering
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

// Import the sync function
import { syncProductsProduction } from '../src/lib/square/production-sync.js';

async function main() {
  try {
    console.log('🚀 Starting production sync for all products including catering...');
    
    const result = await syncProductsProduction({
      validateImages: true,
      batchSize: 25,
      enableCleanup: true
    });
    
    console.log('✅ Sync completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();