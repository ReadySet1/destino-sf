// src/scripts/test-db-connection.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Test database connection
async function main() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configured (value hidden)' : 'Not configured');
    
    // Try to count categories (simple query)
    const categoryCount = await prisma.category.count();
    console.log(`Connection successful! Found ${categoryCount} categories.`);
    
    // List 5 categories
    if (categoryCount > 0) {
      const categories = await prisma.category.findMany({
        take: 5,
        include: {
          _count: {
            select: { products: true }
          }
        }
      });
      
      console.log('\nSample categories:');
      categories.forEach(cat => {
        console.log(`- ${cat.name} (${cat._count.products} products)`);
      });
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('\nPossible solutions:');
    console.log('1. Check if your Supabase project is paused and resume it');
    console.log('2. Verify your DATABASE_URL in .env.local is correct');
    console.log('3. Check your network connection');
    console.log('4. If using VPN, try disabling it');
  } finally {
    await prisma.$disconnect();
  }
}

main(); 