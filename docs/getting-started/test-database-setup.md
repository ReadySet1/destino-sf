# Test Database Setup Guide

This guide helps you test and set up your new test database connection.

## Database Configuration

**Connection Details:**

- Host: `5.78.141.250`
- Port: `5433`
- Database: `postgres`
- User: `destino_test`
- SSL Mode: `require`

**Connection String:**

```
postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require
```

## Available Testing Scripts

### 1. Quick Connection Test

Test basic database connectivity:

```bash
# JavaScript version (faster startup)
pnpm test-new-db

# TypeScript version (with type safety)
pnpm test-new-db-ts
```

**What it tests:**

- ✅ Basic database connection
- ✅ SSL connectivity
- ✅ Database version and current time
- ✅ Schema existence check
- ✅ Table counts (categories, products, orders)
- ✅ CRUD operations (create, read, update, delete)
- ✅ Migration status

### 2. Database Setup

Set up the database schema if it's a fresh database:

```bash
pnpm setup-test-db
```

**What it does:**

- ✅ Tests connection
- ✅ Generates Prisma client
- ✅ Deploys migrations or pushes schema
- ✅ Verifies schema setup
- ✅ Reports table counts

## Testing Scenarios

### Scenario 1: Fresh Database

If this is a completely new database:

1. **Test connection first:**

   ```bash
   pnpm test-new-db-ts
   ```

2. **If schema is missing, set it up:**

   ```bash
   pnpm setup-test-db
   ```

3. **Verify everything works:**
   ```bash
   pnpm test-new-db-ts
   ```

### Scenario 2: Existing Database

If the database already has tables:

1. **Test connection and operations:**

   ```bash
   pnpm test-new-db-ts
   ```

2. **Check for any issues and follow suggested steps**

### Scenario 3: Integration Testing

To use this database for your test suite:

1. **Set environment variable:**

   ```bash
   export DATABASE_URL="postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require"
   ```

2. **Run your existing tests:**
   ```bash
   pnpm test:integration
   ```

## Expected Output

### Successful Connection Test

```
🔍 Testing new test database connection...
Database Host: 5.78.141.250:5433
Database User: destino_test
Database Name: postgres
SSL Mode: require

⏳ Testing basic connection...
✅ Raw connection successful!
Current time: 2024-01-15T10:30:45.123Z
Database version: PostgreSQL 15.x on x86_64-pc-linux-gnu

⏳ Checking database schema...
✅ Schema exists! Found 8 categories.
✅ Found 156 products.
✅ Found 23 orders.

📊 Sample categories:
  - Empanadas (45 products)
  - Alfajores (23 products)
  - Beverages (12 products)

✅ Test database connection is working!

🔄 Checking migration status...
✅ Migration table found
📋 Found 5 recent migrations:
  - 20241201000000_initial_schema (15 steps)
  - 20241205000000_add_catering (8 steps)

🧪 Testing database operations...
✅ Create operation successful: Test Category 1703505045123
✅ Read operation successful: Test Category 1703505045123
✅ Update operation successful
✅ Delete operation successful
✅ All CRUD operations working correctly!

🎉 All database tests passed successfully!

📝 Next steps:
1. If the schema is missing, run: pnpm prisma migrate deploy
2. To push schema changes: pnpm prisma db push
3. To generate client: pnpm prisma generate
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

```
❌ Database connection failed:
Error: connect ETIMEDOUT 5.78.141.250:5433
```

**Solutions:**

- Check your internet connection
- Verify firewall settings
- Ensure the database server is running
- Try connecting from a different network

#### 2. SSL Certificate Issues

```
❌ Database connection failed:
Error: self signed certificate in certificate chain
```

**Solutions:**

- The connection string already includes `sslmode=require`
- If issues persist, try adding `&sslcert=disable` (not recommended for production)

#### 3. Authentication Failed

```
❌ Database connection failed:
Error: password authentication failed for user "destino_test"
```

**Solutions:**

- Verify the connection string is exactly as provided
- Check if the user credentials have changed
- Ensure the database user has proper permissions

#### 4. Schema Missing

```
⚠️ Schema not found or incomplete. This might be a fresh database.
Error: Table 'public.Category' doesn't exist
```

**Solutions:**

- Run the setup script: `pnpm setup-test-db`
- Or manually run: `DATABASE_URL="..." npx prisma migrate deploy`

#### 5. Permission Denied

```
❌ Database operations test failed:
Error: permission denied for table Category
```

**Solutions:**

- Verify the user has CREATE, SELECT, INSERT, UPDATE, DELETE permissions
- Check if the user can create/drop tables if needed for testing

## Manual Database Commands

If you need to run Prisma commands manually against this database:

```bash
# Set the database URL for the session
export DATABASE_URL="postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require"

# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Push schema (alternative to migrations)
npx prisma db push

# Open Prisma Studio (database browser)
npx prisma studio

# Reset database (⚠️ destroys all data)
npx prisma migrate reset
```

## Integration with Existing Tests

To use this database with your existing test suite, you can:

1. **Update test environment variables:**

   ```javascript
   // In your test setup files
   process.env.DATABASE_URL = 'postgresql://destino_test:...';
   ```

2. **Create environment-specific test scripts:**

   ```json
   {
     "scripts": {
       "test:with-remote-db": "DATABASE_URL='postgresql://destino_test:...' pnpm test:integration"
     }
   }
   ```

3. **Use in CI/CD:**
   ```yaml
   # In your CI configuration
   env:
     DATABASE_URL: postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require
   ```

## Security Notes

- ⚠️ This is a test database with exposed credentials in this document
- 🔒 Never use these credentials for production
- 🌐 This database is accessible over the internet - ensure it only contains test data
- 🔄 Consider rotating credentials periodically
- 📝 Monitor access logs if available

## Next Steps

After successful testing:

1. **Use for development:** Configure your `.env.local` with this URL for development
2. **Use for staging:** Deploy your application with this database for staging tests
3. **Set up CI/CD:** Use this database for automated testing in your CI pipeline
4. **Monitor performance:** Test query performance and optimization
5. **Backup strategy:** Consider backup procedures for important test data
