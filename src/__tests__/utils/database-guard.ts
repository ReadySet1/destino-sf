/**
 * Database Safety Guard
 *
 * Prevents destructive test operations (DELETE, TRUNCATE) from running
 * against production or development databases. Must be called before
 * any bulk data deletion in test setup/teardown code.
 */

const BLOCKED_HOSTS = ['supabase.co', 'neon.tech', 'amazonaws.com', 'azure.com'];

/**
 * Validates that the given DATABASE_URL is safe for destructive test operations.
 * Throws if the URL points to a hosted database without "test" in the DB name.
 *
 * Safe: localhost, 127.0.0.1, or any URL with "test" in the database name.
 * Blocked: Supabase, Neon, AWS, Azure URLs without "test" in the DB name.
 */
export function assertTestDatabaseUrl(url: string | undefined): void {
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Cannot run destructive test operations without a database URL.'
    );
  }

  const lowerUrl = url.toLowerCase();

  // Always allow localhost
  if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1')) {
    return;
  }

  // Check for hosted database providers
  const isHostedDb = BLOCKED_HOSTS.some(host => lowerUrl.includes(host));

  if (isHostedDb) {
    // Extract database name from the URL path (after last / before ? or end)
    const dbNameMatch = url.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbNameMatch?.[1] || '';

    if (!dbName.toLowerCase().includes('test')) {
      const safeUrl = url.replace(/\/\/[^@]+@/, '//***@');
      throw new Error(
        `SAFETY GUARD: Refusing to run destructive test operations against hosted database.\n` +
        `DATABASE_URL points to: ${safeUrl}\n` +
        `The database name "${dbName}" does not contain "test".\n\n` +
        `To fix: Create a .env.test file with DATABASE_URL pointing to a test database.\n` +
        `See src/__tests__/setup/.env.test.example for instructions.`
      );
    }
    return;
  }

  // Unknown host — require "test" somewhere in the URL as a safety net
  if (!lowerUrl.includes('test')) {
    const safeUrl = url.replace(/\/\/[^@]+@/, '//***@');
    throw new Error(
      `SAFETY GUARD: DATABASE_URL does not appear to be a test database.\n` +
      `URL must contain "test" or point to localhost. Got: ${safeUrl}\n\n` +
      `See src/__tests__/setup/.env.test.example for instructions.`
    );
  }
}
