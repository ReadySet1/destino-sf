import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required`);
  return value;
}
const TEST_DATABASE_URL = requireEnv('TEST_DATABASE_URL');

console.log('🔧 Setting up test database...');
console.log('Database: 5.78.141.250:5433/postgres');
console.log('');

async function setupTestDatabase(): Promise<void> {
  try {
    // First, test the connection
    console.log('⏳ Testing database connection...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
      log: ['error'],
    });

    // Test basic connection
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful');
    await prisma.$disconnect();

    // Set the DATABASE_URL environment variable for Prisma CLI
    process.env.DATABASE_URL = TEST_DATABASE_URL;

    console.log('\n🔄 Running database migrations...');

    try {
      // Generate Prisma client first
      console.log('⏳ Generating Prisma client...');
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      });
      console.log('✅ Prisma client generated');

      // Deploy migrations
      console.log('⏳ Deploying migrations...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      });
      console.log('✅ Migrations deployed successfully');
    } catch (migrationError: any) {
      console.log('\n⚠️  Migration deployment failed. Trying db push instead...');

      try {
        // If migrations fail, try db push
        console.log('⏳ Pushing schema to database...');
        execSync('npx prisma db push', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        });
        console.log('✅ Schema pushed successfully');
      } catch (pushError: any) {
        console.error('❌ Both migration and push failed:');
        console.error('Migration error:', migrationError.message);
        console.error('Push error:', pushError.message);
        throw pushError;
      }
    }

    // Verify the schema was set up correctly
    console.log('\n🔍 Verifying database schema...');
    const verifyPrisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
    });

    // Test that we can access main tables
    const categoryCount = await verifyPrisma.category.count();
    const productCount = await verifyPrisma.product.count();
    const orderCount = await verifyPrisma.order.count();

    console.log('✅ Schema verification complete:');
    console.log(`  - Categories: ${categoryCount}`);
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Orders: ${orderCount}`);

    await verifyPrisma.$disconnect();

    console.log('\n🎉 Test database setup completed successfully!');
    console.log('\n📝 You can now:');
    console.log('1. Run tests against this database');
    console.log('2. Use it for development/staging');
    console.log('3. Test the connection with: pnpm test-new-db-ts');
  } catch (error: any) {
    console.error('\n❌ Test database setup failed:');
    console.error('Error:', error.message);

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure the database server is accessible');
    console.log('2. Check user permissions for schema creation');
    console.log('3. Verify network connectivity');
    console.log('4. Check if SSL certificate is valid');

    throw error;
  }
}

// Execute setup
setupTestDatabase().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
