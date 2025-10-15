import { execSync } from 'child_process';
import * as net from 'net';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('🔍 Supabase Database Connection Diagnostics for Vercel');
console.log('====================================================');
console.log('');

// Check environment variables
console.log('1️⃣ Environment Variables Check');
console.log('==============================');
console.log(`DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
console.log(`DIRECT_URL configured: ${!!process.env.DIRECT_URL}`);

if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);

  if (urlParts) {
    console.log(`\nPooled Connection (DATABASE_URL):`);
    console.log(`  Host: ${urlParts[3]}`);
    console.log(`  Port: ${urlParts[4]}`);
    console.log(`  Database: ${urlParts[5]}`);
    console.log(`  Has pgbouncer param: ${dbUrl.includes('pgbouncer=true')}`);
    console.log(`  Has SSL param: ${dbUrl.includes('sslmode=')}`);
  }
}

if (process.env.DIRECT_URL) {
  const directUrl = process.env.DIRECT_URL;
  const urlParts = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);

  if (urlParts) {
    console.log(`\nDirect Connection (DIRECT_URL):`);
    console.log(`  Host: ${urlParts[3]}`);
    console.log(`  Port: ${urlParts[4]}`);
    console.log(`  Database: ${urlParts[5]}`);
    console.log(`  Has SSL param: ${directUrl.includes('sslmode=')}`);
  }
}
console.log('\n2️⃣ Recommended Supabase Connection Strings');
console.log('=========================================');
console.log('\nFor Vercel deployment, use these formats:');
console.log('\nDATABASE_URL (Pooled - for serverless):');
console.log(
  'postgresql://[user]:[password]@[project-ref].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15&sslmode=require'
);
console.log('\nDIRECT_URL (Direct - for migrations):');
console.log(
  'postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require'
);

console.log('\n3️⃣ Connection Test');
console.log('=================');

async function testConnection(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const timeout = 5000; // 5 seconds

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      console.log(`✅ TCP connection successful to ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log(`❌ TCP connection timeout to ${host}:${port} (${timeout}ms)`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (error: any) => {
      console.log(`❌ TCP connection failed to ${host}:${port}`);
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });

    socket.connect(port, host);
  });
}
// Test connections if URLs are available
async function runTests() {
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);

    if (urlParts) {
      console.log('\nTesting pooled connection...');
      await testConnection(urlParts[3], parseInt(urlParts[4]));
    }
  }

  if (process.env.DIRECT_URL) {
    const directUrl = process.env.DIRECT_URL;
    const urlParts = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);

    if (urlParts) {
      console.log('\nTesting direct connection...');
      await testConnection(urlParts[3], parseInt(urlParts[4]));
    }
  }

  console.log('\n4️⃣ Prisma Connection Test');
  console.log('========================');

  try {
    const { prisma, checkDatabaseHealth } = await import('../lib/db');
    const health = await checkDatabaseHealth();

    if (health.connected) {
      console.log(`✅ Prisma connection successful (latency: ${health.latency}ms)`);
    } else {
      console.log(`❌ Prisma connection failed: ${health.error}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.log(
      `❌ Prisma test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

runTests()
  .then(() => {
    console.log('\n✅ Diagnostics complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Diagnostics failed:', error);
    process.exit(1);
  });
