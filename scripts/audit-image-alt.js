#!/usr/bin/env node

/**
 * Image Alt Text Audit Script
 *
 * Scans all TypeScript/TSX files for Next.js Image components
 * and checks for proper alt text implementation.
 *
 * Usage: node scripts/audit-image-alt.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const REPORT_FILE = path.join(__dirname, '../docs/IMAGE_ALT_AUDIT_REPORT.md');

// Patterns to identify issues
const GENERIC_ALT_PATTERNS = [
  /^image$/i,
  /^photo$/i,
  /^picture$/i,
  /^img$/i,
  /^icon$/i,
  /^logo$/i,
  /^banner$/i,
  /^product$/i,
  /^item$/i,
];

// Statistics
const stats = {
  totalFiles: 0,
  totalImages: 0,
  missingAlt: 0,
  emptyAlt: 0,
  genericAlt: 0,
  goodAlt: 0,
  issues: [],
};

/**
 * Recursively find all TSX files
 */
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if alt text is generic
 */
function isGenericAlt(altText) {
  return GENERIC_ALT_PATTERNS.some(pattern => pattern.test(altText.trim()));
}

/**
 * Analyze a single file for Image components
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(SRC_DIR, filePath);

  // Only analyze files that import from 'next/image'
  if (!content.includes("from 'next/image'") && !content.includes('from "next/image"')) {
    return;
  }

  stats.totalFiles++;

  // Find all Next.js Image components (multi-line aware)
  // Match <Image followed by space, /, or > to avoid matching <ImagePlaceholder, <ImageIcon, etc.
  const imageRegex = /<Image[\s/>][^>]*>/gs;
  const imageMatches = content.matchAll(imageRegex);

  for (const match of imageMatches) {
    stats.totalImages++;
    const imageTag = match[0];

    // Find line number of this Image tag
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length;

    // Check for alt attribute in the full tag
    const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);
    const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

    if (!altMatch && !altMatchExpr) {
      // Missing alt attribute
      stats.missingAlt++;
      stats.issues.push({
        type: 'MISSING',
        file: relativePath,
        line: lineNumber,
        code: `<Image`,
        severity: 'HIGH',
      });
    } else if (altMatch) {
      const altText = altMatch[1];

      if (altText === '') {
        // Empty alt (decorative image - this is OK for decorative images)
        stats.emptyAlt++;
        stats.issues.push({
          type: 'EMPTY',
          file: relativePath,
          line: lineNumber,
          code: `<Image`,
          altText: '(empty)',
          severity: 'INFO',
        });
      } else if (isGenericAlt(altText)) {
        // Generic alt text
        stats.genericAlt++;
        stats.issues.push({
          type: 'GENERIC',
          file: relativePath,
          line: lineNumber,
          code: `<Image`,
          altText,
          severity: 'MEDIUM',
        });
      } else {
        // Good alt text
        stats.goodAlt++;
      }
    } else {
      // Alt text from expression (variable or function)
      stats.goodAlt++;
    }
  }

  // Also check for self-closing Image tags
  const selfClosingRegex = /<Image[^>]*\/>/gs;
  const selfClosingMatches = content.matchAll(selfClosingRegex);

  for (const match of selfClosingMatches) {
    // Skip if already counted (shouldn't happen but just in case)
    if (match[0].endsWith('/>')) {
      // Already handled by main regex above
      continue;
    }
  }
}

/**
 * Generate markdown report
 */
function generateReport() {
  const date = new Date().toISOString().split('T')[0];

  let report = `# Image Alt Text Audit Report\n\n`;
  report += `**Generated:** ${date}\n\n`;
  report += `---\n\n`;

  // Summary
  report += `## 📊 Summary\n\n`;
  report += `| Metric | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  report += `| Total Files Scanned | ${stats.totalFiles} | - |\n`;
  report += `| Total Images Found | ${stats.totalImages} | 100% |\n`;
  report += `| ✅ Good Alt Text | ${stats.goodAlt} | ${((stats.goodAlt / stats.totalImages) * 100).toFixed(1)}% |\n`;
  report += `| ⚠️ Generic Alt Text | ${stats.genericAlt} | ${((stats.genericAlt / stats.totalImages) * 100).toFixed(1)}% |\n`;
  report += `| ℹ️ Empty Alt (Decorative) | ${stats.emptyAlt} | ${((stats.emptyAlt / stats.totalImages) * 100).toFixed(1)}% |\n`;
  report += `| ❌ Missing Alt | ${stats.missingAlt} | ${((stats.missingAlt / stats.totalImages) * 100).toFixed(1)}% |\n`;
  report += `\n`;

  // Overall score
  const score = ((stats.goodAlt / stats.totalImages) * 100).toFixed(1);
  report += `### Overall Alt Text Score: ${score}%\n\n`;

  if (score >= 90) {
    report += `✅ **Excellent!** Your alt text implementation is very good.\n\n`;
  } else if (score >= 75) {
    report += `⚠️ **Good**, but there's room for improvement.\n\n`;
  } else {
    report += `❌ **Needs Attention** - Many images need better alt text.\n\n`;
  }

  report += `---\n\n`;

  // Issues by severity
  const highIssues = stats.issues.filter(i => i.severity === 'HIGH');
  const mediumIssues = stats.issues.filter(i => i.severity === 'MEDIUM');
  const infoIssues = stats.issues.filter(i => i.severity === 'INFO');

  // High severity issues
  if (highIssues.length > 0) {
    report += `## ❌ High Priority Issues (${highIssues.length})\n\n`;
    report += `**Missing Alt Attributes** - These MUST be fixed for accessibility.\n\n`;

    highIssues.forEach(issue => {
      report += `### ${issue.file}:${issue.line}\n`;
      report += `\`\`\`tsx\n${issue.code}\n\`\`\`\n`;
      report += `**Action Required:** Add a descriptive alt attribute.\n\n`;
    });
  }

  // Medium severity issues
  if (mediumIssues.length > 0) {
    report += `## ⚠️ Medium Priority Issues (${mediumIssues.length})\n\n`;
    report += `**Generic Alt Text** - Should be more descriptive.\n\n`;

    mediumIssues.forEach(issue => {
      report += `### ${issue.file}:${issue.line}\n`;
      report += `\`\`\`tsx\n${issue.code}\n\`\`\`\n`;
      report += `**Current Alt:** "${issue.altText}"\n`;
      report += `**Suggestion:** Add more context (e.g., product name, specific details).\n\n`;
    });
  }

  // Info issues
  if (infoIssues.length > 0) {
    report += `## ℹ️ Informational (${infoIssues.length})\n\n`;
    report += `**Empty Alt Text** - Verify these are truly decorative images.\n\n`;

    infoIssues.forEach(issue => {
      report += `### ${issue.file}:${issue.line}\n`;
      report += `\`\`\`tsx\n${issue.code}\n\`\`\`\n`;
      report += `**Note:** Empty alt is appropriate for decorative images only.\n\n`;
    });
  }

  // Recommendations
  report += `---\n\n`;
  report += `## 💡 Recommendations\n\n`;
  report += `1. **Fix all missing alt attributes** (${stats.missingAlt} images)\n`;
  report += `2. **Improve generic alt text** (${stats.genericAlt} images)\n`;
  report += `3. **Review empty alt images** to ensure they are decorative\n`;
  report += `4. Follow the guidelines in \`docs/ALT_TEXT_GUIDELINES.md\`\n\n`;

  // Priority files
  const fileGroups = {};
  stats.issues.forEach(issue => {
    if (issue.severity !== 'INFO') {
      if (!fileGroups[issue.file]) {
        fileGroups[issue.file] = 0;
      }
      fileGroups[issue.file]++;
    }
  });

  const priorityFiles = Object.entries(fileGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (priorityFiles.length > 0) {
    report += `## 📁 Priority Files to Fix\n\n`;
    report += `Files with the most issues:\n\n`;
    priorityFiles.forEach(([file, count]) => {
      report += `- **${file}** - ${count} issue(s)\n`;
    });
    report += `\n`;
  }

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting Image Alt Text Audit...\n');

  const files = findTsxFiles(SRC_DIR);
  console.log(`📄 Found ${files.length} TSX/JSX files\n`);

  files.forEach(file => analyzeFile(file));

  console.log('📊 Audit Statistics:');
  console.log(`   Total Files: ${stats.totalFiles}`);
  console.log(`   Total Images: ${stats.totalImages}`);
  console.log(`   ✅ Good Alt: ${stats.goodAlt}`);
  console.log(`   ⚠️  Generic Alt: ${stats.genericAlt}`);
  console.log(`   ℹ️  Empty Alt: ${stats.emptyAlt}`);
  console.log(`   ❌ Missing Alt: ${stats.missingAlt}\n`);

  const report = generateReport();

  // Ensure docs directory exists
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_FILE, report);

  console.log(`✅ Report generated: ${path.relative(process.cwd(), REPORT_FILE)}\n`);

  // Exit with error code if critical issues found
  if (stats.missingAlt > 0) {
    console.log('⚠️  Critical issues found: Missing alt attributes detected');
    process.exit(0); // Still exit 0 for now, just informational
  }
}

// Run the audit
main();
