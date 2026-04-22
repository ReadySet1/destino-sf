import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL env var is required');
}

interface DatabaseInfo {
  current_time: Date;
  db_version: string;
}

interface TableInfo {
  table_name: string;
}

console.log('🔍 Testing new test database connection...');
console.log('Database Host: 5.78.141.250:5433');
console.log('Database User: destino_test');
console.log('Database Name: postgres');
console.log('SSL Mode: require');
console.log('');

// Initialize Prisma with the test database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection(): Promise<void> {
  try {
    console.log('⏳ Testing basic connection...');

    // Test raw database connection
    const result = await prisma.$queryRaw<DatabaseInfo[]>`
      SELECT NOW() as current_time, version() as db_version
    `;

    console.log('✅ Raw connection successful!');
    console.log('Current time:', result[0].current_time);
    console.log('Database version:', result[0].db_version);
    console.log('');

    // Check if our schema exists
    console.log('⏳ Checking database schema...');

    try {
      // Try to count records from existing tables
      const categoryCount = await prisma.category.count();
      console.log(`✅ Schema exists! Found ${categoryCount} categories.`);

      const productCount = await prisma.product.count();
      console.log(`✅ Found ${productCount} products.`);

      const orderCount = await prisma.order.count();
      console.log(`✅ Found ${orderCount} orders.`);

      // Test a simple query with relations
      if (categoryCount > 0) {
        const categories = await prisma.category.findMany({
          take: 3,
          include: {
            _count: {
              select: { products: true },
            },
          },
        });

        console.log('\n📊 Sample categories:');
        categories.forEach(cat => {
          console.log(`  - ${cat.name} (${cat._count.products} products)`);
        });
      }
    } catch (schemaError: any) {
      console.log('⚠️  Schema not found or incomplete. This might be a fresh database.');
      console.log('Error:', schemaError.message);

      // Check what tables exist
      console.log('\n⏳ Checking existing tables...');
      const tables = await prisma.$queryRaw<TableInfo[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;

      if (tables.length > 0) {
        console.log('📋 Existing tables:');
        tables.forEach(table => console.log(`  - ${table.table_name}`));
      } else {
        console.log('📋 No tables found in public schema.');
      }
    }

    console.log('\n✅ Test database connection is working!');
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    if (error.code) {
      console.error('Error code:', error.code);
    }

    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if the database server is running');
    console.log('2. Verify the connection string is correct');
    console.log('3. Check network connectivity to 5.78.141.250:5433');
    console.log('4. Ensure SSL is properly configured');
    console.log('5. Verify database user permissions');

    throw error;
  }
}

// Additional function to test database operations
async function testDatabaseOperations(): Promise<void> {
  console.log('\n🧪 Testing database operations...');

  try {
    // Test creating a simple record
    const testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        description: 'Test category for connection verification',
        slug: `test-category-${Date.now()}`,
        order: 999,
      },
    });

    console.log('✅ Create operation successful:', testCategory.name);

    // Test reading the record
    const foundCategory = await prisma.category.findUnique({
      where: { id: testCategory.id },
    });

    console.log('✅ Read operation successful:', foundCategory?.name);

    // Test updating the record
    const updatedCategory = await prisma.category.update({
      where: { id: testCategory.id },
      data: { description: 'Updated test description' },
    });

    console.log('✅ Update operation successful');

    // Test deleting the record
    await prisma.category.delete({
      where: { id: testCategory.id },
    });

    console.log('✅ Delete operation successful');
    console.log('✅ All CRUD operations working correctly!');
  } catch (error: any) {
    console.error('❌ Database operations test failed:', error.message);
    throw error;
  }
}

// Function to test migrations
async function checkMigrationStatus(): Promise<void> {
  console.log('\n🔄 Checking migration status...');

  try {
    // Check if _prisma_migrations table exists
    const migrationTables = await prisma.$queryRaw<TableInfo[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '_prisma_migrations';
    `;

    if (migrationTables.length > 0) {
      const migrations = await prisma.$queryRaw<any[]>`
        SELECT migration_name, applied_steps_count, started_at, finished_at
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 5;
      `;

      console.log('✅ Migration table found');
      console.log(`📋 Found ${migrations.length} recent migrations:`);
      migrations.forEach(migration => {
        console.log(`  - ${migration.migration_name} (${migration.applied_steps_count} steps)`);
      });
    } else {
      console.log('⚠️  No migration table found. Database might need to be migrated.');
    }
  } catch (error: any) {
    console.log('⚠️  Could not check migration status:', error.message);
  }
}

// Main execution function
async function main(): Promise<void> {
  try {
    await testConnection();
    await checkMigrationStatus();
    await testDatabaseOperations();
    console.log('\n🎉 All database tests passed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. If the schema is missing, run: pnpm prisma migrate deploy');
    console.log('2. To push schema changes: pnpm prisma db push');
    console.log('3. To generate client: pnpm prisma generate');
  } catch (error) {
    console.error('\n💥 Database tests failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
