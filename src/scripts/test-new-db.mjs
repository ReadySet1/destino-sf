import { PrismaClient } from '@prisma/client';

// Your test database URL
const TEST_DATABASE_URL = "postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require";

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
      url: TEST_DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('⏳ Testing basic connection...');
    
    // Test raw database connection
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`;
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
              select: { products: true }
            }
          }
        });
        
        console.log('\n📊 Sample categories:');
        categories.forEach(cat => {
          console.log(`  - ${cat.name} (${cat._count.products} products)`);
        });
      }
      
    } catch (schemaError) {
      console.log('⚠️  Schema not found or incomplete. This might be a fresh database.');
      console.log('Error:', schemaError.message);
      
      // Check what tables exist
      console.log('\n⏳ Checking existing tables...');
      const tables = await prisma.$queryRaw`
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
    
  } catch (error) {
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
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to test database operations
async function testDatabaseOperations() {
  console.log('\n🧪 Testing database operations...');
  
  try {
    // Test creating a simple record
    const testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        description: 'Test category for connection verification',
        slug: `test-category-${Date.now()}`,
        order: 999,
      }
    });
    
    console.log('✅ Create operation successful:', testCategory.name);
    
    // Test reading the record
    const foundCategory = await prisma.category.findUnique({
      where: { id: testCategory.id }
    });
    
    console.log('✅ Read operation successful:', foundCategory?.name);
    
    // Test updating the record
    const updatedCategory = await prisma.category.update({
      where: { id: testCategory.id },
      data: { description: 'Updated test description' }
    });
    
    console.log('✅ Update operation successful');
    
    // Test deleting the record
    await prisma.category.delete({
      where: { id: testCategory.id }
    });
    
    console.log('✅ Delete operation successful');
    console.log('✅ All CRUD operations working correctly!');
    
  } catch (error) {
    console.error('❌ Database operations test failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await testConnection();
    await testDatabaseOperations();
    console.log('\n🎉 All database tests passed successfully!');
  } catch (error) {
    console.error('\n💥 Database tests failed');
    process.exit(1);
  }
}

main(); 