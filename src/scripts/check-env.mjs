import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Function to safely display token info (first 4 and last 4 chars)
function maskToken(token) {
  if (!token) return 'NOT SET';
  if (token.length <= 8) return '********';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

// Check required environment variables
console.log('Environment Variables Check:');
console.log('----------------------------');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`SQUARE_ACCESS_TOKEN (Sandbox): ${maskToken(process.env.SQUARE_ACCESS_TOKEN)}`);
console.log(`SQUARE_PRODUCTION_TOKEN: ${maskToken(process.env.SQUARE_PRODUCTION_TOKEN)}`);
console.log(`NEXT_PUBLIC_SANITY_PROJECT_ID: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'NOT SET'}`);
console.log(`NEXT_PUBLIC_SANITY_DATASET: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'NOT SET'}`);
console.log(`SANITY_API_TOKEN: ${maskToken(process.env.SANITY_API_TOKEN)}`);

// Determine Square environment
const squareEnvironment = process.env.SQUARE_PRODUCTION_TOKEN 
  ? 'PRODUCTION (using SQUARE_PRODUCTION_TOKEN)'
  : process.env.SQUARE_ACCESS_TOKEN 
    ? 'SANDBOX (using SQUARE_ACCESS_TOKEN)'
    : 'NOT CONFIGURED';

console.log('\nActive Square Environment: ' + squareEnvironment);

if (!process.env.SQUARE_PRODUCTION_TOKEN) {
  console.log('\nWARNING: SQUARE_PRODUCTION_TOKEN is not set. If you want to sync with production Square, please set this variable in your .env.local file.');
  console.log('Example in .env.local:');
  console.log('SQUARE_PRODUCTION_TOKEN="your_production_token_here"');
} 