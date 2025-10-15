// scripts/fix-product-mappings.ts
import { PrismaClient } from '@prisma/client';
import { ProductMappingService } from '../src/lib/products/mapping-service';
import { logger } from '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting product mapping fix...');

  try {
    const service = new ProductMappingService();

    // Step 1: Run audit
    logger.info('Running product audit...');
    const auditResult = await service.auditAllMappings();

    logger.info(`Audit complete:
      - Total Products: ${auditResult.totalProducts}
      - Valid: ${auditResult.validProducts}
      - Invalid: ${auditResult.invalidProducts}
      - Issues Found: ${auditResult.issues.length}
    `);

    // Log critical issues
    const criticalIssues = auditResult.issues.filter(i => i.severity === 'ERROR');
    if (criticalIssues.length > 0) {
      logger.warn(`Found ${criticalIssues.length} critical issues:`);

      // Group issues by type
      const issuesByType = criticalIssues.reduce(
        (acc, issue) => {
          if (!acc[issue.type]) acc[issue.type] = [];
          acc[issue.type].push(issue);
          return acc;
        },
        {} as Record<string, typeof criticalIssues>
      );

      for (const [type, issues] of Object.entries(issuesByType)) {
        logger.info(`  ${type}: ${issues.length} issues`);
      }

      // Show examples of each issue type
      for (const [type, issues] of Object.entries(issuesByType)) {
        logger.info(`\nExamples of ${type}:`);
        const examples = issues.slice(0, 3); // Show first 3 examples
        for (const issue of examples) {
          logger.info(`  - Product: ${issue.productId} (${issue.squareId})`);
          logger.info(`    Message: ${issue.message}`);
          if (issue.expected && issue.actual) {
            logger.info(`    Expected: "${issue.expected}"`);
            logger.info(`    Actual: "${issue.actual}"`);
          }
        }
      }
    }

    // Step 2: Apply fixes
    if (criticalIssues.length > 0) {
      logger.info('Applying fixes...');
      await service.fixMappings(auditResult);

      // Step 3: Verify fixes
      logger.info('Verifying fixes...');
      const verificationAudit = await service.auditAllMappings();

      logger.info(`Fix verification:
        - Remaining Invalid: ${verificationAudit.invalidProducts}
        - Fixed: ${auditResult.invalidProducts - verificationAudit.invalidProducts}
        - Remaining Issues: ${verificationAudit.issues.length}
      `);

      if (verificationAudit.invalidProducts > 0) {
        logger.warn('Some issues could not be automatically fixed and require manual review.');

        // Generate report for manual review
        const manualReviewProducts = await prisma.product.findMany({
          where: {
            mappingStatus: 'NEEDS_REVIEW',
          },
          include: {
            category: true,
          },
        });

        logger.info(`Products requiring manual review: ${manualReviewProducts.length}`);
        for (const product of manualReviewProducts) {
          logger.info(
            `  - ${product.name} (${product.squareId}) - Category: ${product.category?.name}`
          );
        }

        // Show remaining issues by type
        const remainingIssuesByType = verificationAudit.issues.reduce(
          (acc, issue) => {
            if (!acc[issue.type]) acc[issue.type] = [];
            acc[issue.type].push(issue);
            return acc;
          },
          {} as Record<string, typeof verificationAudit.issues>
        );

        logger.info('\nRemaining issues by type:');
        for (const [type, issues] of Object.entries(remainingIssuesByType)) {
          logger.info(`  ${type}: ${issues.length} issues`);
        }
      }

      // Show recommendations
      if (verificationAudit.recommendations.length > 0) {
        logger.info('\nRecommendations for next steps:');
        verificationAudit.recommendations.forEach((rec, index) => {
          logger.info(`  ${index + 1}. ${rec}`);
        });
      }
    } else {
      logger.info('No critical issues found. All products are correctly mapped!');
    }
  } catch (error) {
    logger.error('Fix script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
