#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';
import { logger } from '../src/utils/logger';

async function debugSyncIssue() {
  try {
    logger.info('🔍 Debugging Square sync issue...');

    // 1. Check environment variables
    logger.info('\n📋 Environment Check:');
    const requiredEnvVars = [
      'SQUARE_ACCESS_TOKEN',
      'SQUARE_ENVIRONMENT',
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        const maskedValue =
          envVar.includes('TOKEN') || envVar.includes('SECRET') || envVar.includes('URL')
            ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
            : value;
        logger.info(`   ✅ ${envVar}: ${maskedValue}`);
      } else {
        logger.warn(`   ❌ ${envVar}: NOT SET`);
      }
    }

    // 2. Check database connectivity
    logger.info('\n🗄️ Database Connectivity Check:');
    try {
      await prisma.$connect();
      logger.info('   ✅ Database connection successful');

      // Check if we can query the database
      const productCount = await prisma.product.count();
      logger.info(`   ✅ Database query successful - ${productCount} products found`);
    } catch (dbError) {
      logger.error('   ❌ Database connection failed:', dbError);
      return;
    }

    // 3. Check Square API connectivity
    logger.info('\n🔌 Square API Connectivity Check:');
    try {
      // Import Square client
      const { squareClient } = await import('../src/lib/square/client');

      if (squareClient.catalogApi) {
        logger.info('   ✅ Square catalog API client initialized');

        // Try a simple API call
        try {
          const response = await squareClient.catalogApi.listCatalog();
          logger.info(
            `   ✅ Square API call successful - ${response.result.objects?.length || 0} objects returned`
          );
        } catch (apiError: any) {
          logger.warn(`   ⚠️ Square API call failed: ${apiError.message || 'Unknown error'}`);
          if (apiError.statusCode) {
            logger.warn(`   Status Code: ${apiError.statusCode}`);
          }
        }
      } else {
        logger.warn('   ⚠️ Square catalog API client not available');
      }
    } catch (importError) {
      logger.error('   ❌ Failed to import Square client:', importError);
    }

    // 4. Check sync configuration
    logger.info('\n⚙️ Sync Configuration Check:');
    try {
      const { CATEGORY_MAPPINGS, LEGACY_CATEGORY_MAPPINGS } = await import(
        '../src/lib/square/category-mapper'
      );
      logger.info(
        `   ✅ Category mappings loaded - ${Object.keys(CATEGORY_MAPPINGS).length} categories`
      );
      logger.info(
        `   ✅ Legacy category mappings loaded - ${Object.keys(LEGACY_CATEGORY_MAPPINGS).length} categories`
      );

      // Check specific problematic categories
      const sharePlattersId = '4YZ7LW7PRJRDICUM76U3FTGU';
      if (CATEGORY_MAPPINGS[sharePlattersId]) {
        logger.info(`   ✅ Share Platters category found: ${CATEGORY_MAPPINGS[sharePlattersId]}`);
      } else {
        logger.warn(`   ⚠️ Share Platters category not found in mappings`);
      }
    } catch (configError) {
      logger.error('   ❌ Failed to load sync configuration:', configError);
    }

    // 5. Check recent sync logs for errors
    logger.info('\n📊 Recent Sync Logs Analysis:');
    try {
      const recentLogs = await prisma.userSyncLog.findMany({
        where: {
          startTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10,
      });

      if (recentLogs.length === 0) {
        logger.info('   ℹ️ No recent sync logs found');
      } else {
        logger.info(`   📋 Found ${recentLogs.length} recent sync logs:`);

        for (const log of recentLogs) {
          const duration = log.endTime
            ? log.endTime.getTime() - log.startTime.getTime()
            : Date.now() - log.startTime.getTime();
          const durationMinutes = Math.floor(duration / (1000 * 60));

          logger.info(
            `      ${log.status}: ${log.syncId} (${durationMinutes}m) - ${log.message || 'No message'}`
          );

          if (log.errors) {
            try {
              const errors = JSON.parse(log.errors as string);
              if (Array.isArray(errors) && errors.length > 0) {
                logger.warn(`         Errors: ${errors.join(', ')}`);
              }
            } catch {
              logger.warn(`         Errors: ${log.errors}`);
            }
          }
        }
      }
    } catch (logError) {
      logger.error('   ❌ Failed to analyze sync logs:', logError);
    }

    // 6. Check for stuck processes
    logger.info('\n🚫 Stuck Process Check:');
    try {
      const stuckSyncs = await prisma.userSyncLog.findMany({
        where: {
          status: 'RUNNING',
          startTime: {
            lt: new Date(Date.now() - 15 * 60 * 1000), // Older than 15 minutes
          },
        },
        select: {
          syncId: true,
          startTime: true,
          message: true,
          currentStep: true,
        },
      });

      if (stuckSyncs.length === 0) {
        logger.info('   ✅ No stuck syncs found');
      } else {
        logger.warn(`   ⚠️ Found ${stuckSyncs.length} potentially stuck sync(s):`);
        for (const sync of stuckSyncs) {
          const duration = Date.now() - sync.startTime.getTime();
          const durationMinutes = Math.floor(duration / (1000 * 60));
          logger.warn(
            `      ${sync.syncId}: Stuck for ${durationMinutes}m at step "${sync.currentStep}"`
          );
        }
      }
    } catch (stuckError) {
      logger.error('   ❌ Failed to check for stuck processes:', stuckError);
    }

    // 7. Recommendations
    logger.info('\n💡 Recommendations:');
    logger.info('   1. If sync is stuck, run: tsx scripts/check-sync-status.ts fix');
    logger.info('   2. Check Vercel function logs for timeout errors');
    logger.info('   3. Verify Square API rate limits are not exceeded');
    logger.info('   4. Check if database connection pool is exhausted');
    logger.info('   5. Ensure all environment variables are set in Vercel');
  } catch (error) {
    logger.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSyncIssue().catch(console.error);
