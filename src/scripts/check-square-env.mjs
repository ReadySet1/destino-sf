// src/scripts/check-square-env.mjs
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

// Check Square environment tokens
console.log('Square Environment Check:');
console.log('----------------------------');
console.log(`SQUARE_ACCESS_TOKEN (Sandbox): ${maskToken(process.env.SQUARE_ACCESS_TOKEN)}`);
console.log(`SQUARE_PRODUCTION_TOKEN: ${maskToken(process.env.SQUARE_PRODUCTION_TOKEN)}`);
console.log('');

if (!process.env.SQUARE_PRODUCTION_TOKEN) {
  console.log('WARNING: SQUARE_PRODUCTION_TOKEN is not set. If you want to sync with production Square, please set this variable in your .env.local file.');
  console.log('Example in .env.local:');
  console.log('SQUARE_PRODUCTION_TOKEN="your_production_token_here"');
} else {
  console.log('You have a production token configured. The sync script will use the production environment.');
} 