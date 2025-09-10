import { NextResponse } from 'next/server';
import { resilientPrisma } from '@/lib/db-connection-fix';

/**
 * Health check endpoint for monitoring webhook system
 * Tests database connectivity and system status
 */
export async function GET() {
  const checks = {
    database: false,
    webhookQueue: false,
    timestamp: new Date().toISOString(),
    version: 'webhook-fix-v1.0.0',
    environment: process.env.NODE_ENV,
    errors: [] as string[],
  };
  
  // Check database connectivity
  try {
    await resilientPrisma.executeWithRetry(async (prisma) => {
      await prisma.$queryRaw`SELECT 1 as health_check`;
    });
    checks.database = true;
    console.log('✅ Database health check passed');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown database error';
    checks.errors.push(`Database: ${errorMsg}`);
    console.error('❌ Database health check failed:', error);
  }
  
  // Check webhook queue accessibility
  try {
    const queueCount = await resilientPrisma.executeWithRetry(async (prisma) => {
      return await prisma.webhookQueue.count({
        where: {
          status: 'PENDING'
        }
      });
    });
    checks.webhookQueue = true;
    console.log(`✅ Webhook queue accessible, ${queueCount} pending items`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown queue error';
    checks.errors.push(`WebhookQueue: ${errorMsg}`);
    console.error('❌ Webhook queue health check failed:', error);
  }
  
  const allHealthy = checks.database && checks.webhookQueue && checks.errors.length === 0;
  
  return NextResponse.json(checks, { 
    status: allHealthy ? 200 : 503 
  });
}