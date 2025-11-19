import { prisma } from '@/lib/db';

export interface AuditLogEntry {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
  zoneId: string;
  zoneIdentifier: string;
  adminUserId: string;
  adminEmail: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditContext {
  adminUserId: string | null;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Set audit context for the current database transaction
 * This allows the trigger to capture admin user information
 */
export async function setAuditContext(context: AuditContext) {
  // Only set admin_user_id if it's provided (not null/undefined)
  if (context.adminUserId) {
    await prisma.$executeRaw`
      SELECT set_config('app.admin_user_id', ${context.adminUserId}, true)
    `;
  }

  await prisma.$executeRaw`
    SELECT set_config('app.admin_email', ${context.adminEmail}, true)
  `;

  if (context.ipAddress) {
    await prisma.$executeRaw`
      SELECT set_config('app.ip_address', ${context.ipAddress}, true)
    `;
  }

  if (context.userAgent) {
    await prisma.$executeRaw`
      SELECT set_config('app.user_agent', ${context.userAgent}, true)
    `;
  }
}

/**
 * Get audit log entries for a specific delivery zone
 */
export async function getZoneAuditLog(zoneId: string, limit = 50): Promise<AuditLogEntry[]> {
  const result = await prisma.$queryRaw<AuditLogEntry[]>`
    SELECT 
      id,
      operation,
      zone_id as "zoneId",
      zone_identifier as "zoneIdentifier",
      admin_user_id as "adminUserId",
      admin_email as "adminEmail",
      old_values as "oldValues",
      new_values as "newValues",
      created_at as "createdAt",
      ip_address as "ipAddress",
      user_agent as "userAgent"
    FROM delivery_zone_audit_log 
    WHERE zone_id = ${zoneId}::uuid
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Get all recent audit log entries
 */
export async function getRecentAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const result = await prisma.$queryRaw<AuditLogEntry[]>`
    SELECT 
      id,
      operation,
      zone_id as "zoneId",
      zone_identifier as "zoneIdentifier",
      admin_user_id as "adminUserId",
      admin_email as "adminEmail",
      old_values as "oldValues",
      new_values as "newValues",
      created_at as "createdAt",
      ip_address as "ipAddress",
      user_agent as "userAgent"
    FROM delivery_zone_audit_log 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Get audit summary with human-readable changes
 */
export async function getAuditSummary(limit = 50) {
  const result = await prisma.$queryRaw`
    SELECT * FROM delivery_zone_audit_summary
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Clean up old audit log entries (older than specified days)
 */
export async function cleanupOldAuditLogs(olderThanDays = 90) {
  const result = await prisma.$executeRaw`
    DELETE FROM delivery_zone_audit_log 
    WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
  `;

  return result;
}

/**
 * Get audit statistics
 */
export async function getAuditStats() {
  const stats = await prisma.$queryRaw<
    Array<{
      operation: string;
      count: bigint;
      latest: Date;
    }>
  >`
    SELECT 
      operation,
      COUNT(*) as count,
      MAX(created_at) as latest
    FROM delivery_zone_audit_log 
    GROUP BY operation
    ORDER BY count DESC
  `;

  const totalCount = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM delivery_zone_audit_log
  `;

  return {
    byOperation: stats.map(s => ({
      operation: s.operation,
      count: Number(s.count),
      latest: s.latest,
    })),
    total: Number(totalCount[0]?.total || 0),
  };
}
