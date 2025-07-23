#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';

interface DependencyUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'major' | 'minor' | 'patch';
  category: 'safe' | 'risky' | 'breaking';
  testDependency: boolean;
}

interface UpdateResult {
  success: boolean;
  updated: string[];
  failed: string[];
  rollbacks: string[];
  testsPassed: boolean;
}

class TestDependencyUpdater {
  private readonly backupDir = './dependency-backups';
  private readonly testTimeout = 300000; // 5 minutes

  async updateDependencies(): Promise<UpdateResult> {
    console.log('🔄 Starting automated dependency updates...');

    const result: UpdateResult = {
      success: false,
      updated: [],
      failed: [],
      rollbacks: [],
      testsPassed: false,
    };

    try {
      // Create backup
      await this.createBackup();

      // Analyze outdated dependencies
      const outdated = await this.analyzeOutdatedDependencies();
      const testDeps = outdated.filter(dep => dep.testDependency);

      if (testDeps.length === 0) {
        console.log('✅ All test dependencies are up to date!');
        return { ...result, success: true, testsPassed: true };
      }

      console.log(`📦 Found ${testDeps.length} outdated test dependencies`);

      // Categorize updates by risk
      const safeUpdates = testDeps.filter(dep => dep.category === 'safe');
      const riskyUpdates = testDeps.filter(dep => dep.category === 'risky');
      const breakingUpdates = testDeps.filter(dep => dep.category === 'breaking');

      // Process safe updates first
      if (safeUpdates.length > 0) {
        console.log(`\n🟢 Processing ${safeUpdates.length} safe updates...`);
        const safeResult = await this.processBatchUpdates(safeUpdates, 'safe');
        result.updated.push(...safeResult.updated);
        result.failed.push(...safeResult.failed);
      }

      // Process risky updates with testing
      if (riskyUpdates.length > 0) {
        console.log(`\n🟡 Processing ${riskyUpdates.length} risky updates...`);
        const riskyResult = await this.processRiskyUpdates(riskyUpdates);
        result.updated.push(...riskyResult.updated);
        result.failed.push(...riskyResult.failed);
        result.rollbacks.push(...riskyResult.rollbacks);
      }

      // Process breaking changes individually with confirmation
      if (breakingUpdates.length > 0) {
        console.log(
          `\n🔴 Found ${breakingUpdates.length} breaking updates - manual review required`
        );
        await this.reportBreakingChanges(breakingUpdates);
      }

      // Final test suite validation
      console.log('\n🧪 Running comprehensive test validation...');
      const testsPass = await this.runComprehensiveTests();
      result.testsPassed = testsPass;

      if (!testsPass) {
        console.log('❌ Tests failed after updates - rolling back all changes');
        await this.rollbackAllChanges();
        result.rollbacks.push('all-changes');
        result.success = false;
      } else {
        console.log('✅ All tests passed - updates successful!');
        result.success = true;
      }

      // Cleanup
      await this.cleanup();

      return result;
    } catch (error) {
      console.error('❌ Dependency update failed:', error);
      await this.rollbackAllChanges();
      return { ...result, success: false };
    }
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating backup...');

    await fs.mkdir(this.backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    await fs.mkdir(backupPath, { recursive: true });

    // Backup critical files
    const filesToBackup = [
      'package.json',
      'pnpm-lock.yaml',
      'jest.config.ts',
      'playwright.config.ts',
      'tsconfig.json',
      'tsconfig.test.json',
    ];

    for (const file of filesToBackup) {
      try {
        const content = await fs.readFile(file, 'utf8');
        await fs.writeFile(path.join(backupPath, file), content);
      } catch (error) {
        console.warn(`⚠️ Could not backup ${file}:`, error);
      }
    }

    // Store backup path for rollback
    await fs.writeFile('.dependency-backup-path', backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
  }

  private async analyzeOutdatedDependencies(): Promise<DependencyUpdate[]> {
    console.log('🔍 Analyzing outdated dependencies...');

    try {
      // Get outdated packages
      const output = execSync('pnpm outdated --format=json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const outdatedData = JSON.parse(output);
      const updates: DependencyUpdate[] = [];

      // Read package.json to identify test dependencies
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const testDependencies = new Set([
        ...Object.keys(packageJson.devDependencies || {}),
        ...this.getTestSpecificDependencies(),
      ]);

      for (const [name, info] of Object.entries(outdatedData)) {
        const depInfo = info as any;
        const isTestDep = testDependencies.has(name) || this.isTestRelatedDependency(name);

        if (isTestDep) {
          const update: DependencyUpdate = {
            name,
            currentVersion: depInfo.current,
            latestVersion: depInfo.latest,
            type: this.getUpdateType(depInfo.current, depInfo.latest),
            category: this.categorizeUpdate(name, depInfo.current, depInfo.latest),
            testDependency: true,
          };

          updates.push(update);
        }
      }

      return updates;
    } catch (error) {
      console.warn('⚠️ Could not analyze outdated dependencies:', error);
      return [];
    }
  }

  private getTestSpecificDependencies(): string[] {
    return [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      '@playwright/test',
      'jest',
      'jest-environment-jsdom',
      'ts-jest',
      '@types/jest',
      'playwright',
      'vitest',
      'cypress',
    ];
  }

  private isTestRelatedDependency(name: string): boolean {
    const testPatterns = [
      /^@testing-library/,
      /^@playwright/,
      /jest/,
      /test/,
      /mock/,
      /stub/,
      /spec/,
      /playwright/,
      /cypress/,
      /vitest/,
    ];

    return testPatterns.some(pattern => pattern.test(name));
  }

  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
    const diff = semver.diff(current, latest);
    if (diff === 'major') return 'major';
    if (diff === 'minor') return 'minor';
    return 'patch';
  }

  private categorizeUpdate(
    name: string,
    current: string,
    latest: string
  ): 'safe' | 'risky' | 'breaking' {
    const updateType = this.getUpdateType(current, latest);

    // Breaking changes
    if (updateType === 'major') {
      return 'breaking';
    }

    // Known risky packages
    const riskyPackages = ['jest', '@testing-library/react', '@playwright/test'];
    if (riskyPackages.includes(name) && updateType === 'minor') {
      return 'risky';
    }

    // Type packages are usually safe
    if (name.startsWith('@types/')) {
      return 'safe';
    }

    // Minor and patch updates are generally safe for test dependencies
    return updateType === 'patch' ? 'safe' : 'risky';
  }

  private async processBatchUpdates(
    updates: DependencyUpdate[],
    category: string
  ): Promise<{ updated: string[]; failed: string[] }> {
    const result: { updated: string[]; failed: string[] } = { updated: [], failed: [] };

    for (const update of updates) {
      try {
        console.log(
          `  📦 Updating ${update.name}: ${update.currentVersion} → ${update.latestVersion}`
        );

        execSync(`pnpm add -D ${update.name}@${update.latestVersion}`, {
          stdio: 'pipe',
          timeout: 60000,
        });

        result.updated.push(update.name);
      } catch (error) {
        console.error(`  ❌ Failed to update ${update.name}:`, error);
        result.failed.push(update.name);
      }
    }

    return result;
  }

  private async processRiskyUpdates(
    updates: DependencyUpdate[]
  ): Promise<{ updated: string[]; failed: string[]; rollbacks: string[] }> {
    const result: { updated: string[]; failed: string[]; rollbacks: string[] } = {
      updated: [],
      failed: [],
      rollbacks: [],
    };

    for (const update of updates) {
      console.log(`\n🔄 Processing risky update: ${update.name}`);

      try {
        // Create checkpoint
        const checkpoint = await this.createCheckpoint();

        // Apply update
        execSync(`pnpm add -D ${update.name}@${update.latestVersion}`, {
          stdio: 'pipe',
          timeout: 60000,
        });

        // Run relevant tests
        const testsPass = await this.runRelevantTests(update.name);

        if (testsPass) {
          console.log(`  ✅ ${update.name} updated successfully`);
          result.updated.push(update.name);
        } else {
          console.log(`  ❌ Tests failed after updating ${update.name} - rolling back`);
          await this.rollbackToCheckpoint(checkpoint);
          result.rollbacks.push(update.name);
          result.failed.push(update.name);
        }
      } catch (error) {
        console.error(`  ❌ Failed to update ${update.name}:`, error);
        result.failed.push(update.name);
      }
    }

    return result;
  }

  private async createCheckpoint(): Promise<string> {
    const timestamp = Date.now().toString();
    const checkpointPath = path.join(this.backupDir, `checkpoint-${timestamp}`);

    await fs.mkdir(checkpointPath, { recursive: true });

    // Backup current state
    const files = ['package.json', 'pnpm-lock.yaml'];
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      await fs.writeFile(path.join(checkpointPath, file), content);
    }

    return checkpointPath;
  }

  private async rollbackToCheckpoint(checkpointPath: string): Promise<void> {
    const files = ['package.json', 'pnpm-lock.yaml'];

    for (const file of files) {
      const backupFile = path.join(checkpointPath, file);
      try {
        const content = await fs.readFile(backupFile, 'utf8');
        await fs.writeFile(file, content);
      } catch (error) {
        console.error(`Failed to rollback ${file}:`, error);
      }
    }

    // Reinstall dependencies
    execSync('pnpm install', { stdio: 'pipe' });
  }

  private async runRelevantTests(packageName: string): Promise<boolean> {
    try {
      // Determine which tests to run based on the package
      const testCommand = this.getRelevantTestCommand(packageName);

      execSync(testCommand, {
        stdio: 'pipe',
        timeout: this.testTimeout,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  private getRelevantTestCommand(packageName: string): string {
    // Map packages to relevant test commands
    const testMappings: Record<string, string> = {
      jest: 'pnpm test:unit',
      '@testing-library/react': 'pnpm test:components',
      '@playwright/test': 'pnpm test:e2e:critical',
      'ts-jest': 'pnpm test:unit',
    };

    return testMappings[packageName] || 'pnpm test:unit';
  }

  private async runComprehensiveTests(): Promise<boolean> {
    const testCommands = ['pnpm test:unit', 'pnpm test:components', 'pnpm test:integration'];

    for (const command of testCommands) {
      try {
        console.log(`  🧪 Running: ${command}`);
        execSync(command, {
          stdio: 'pipe',
          timeout: this.testTimeout,
        });
      } catch (error) {
        console.error(`  ❌ Test failed: ${command}`);
        return false;
      }
    }

    return true;
  }

  private async reportBreakingChanges(updates: DependencyUpdate[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      breakingUpdates: updates.map(update => ({
        name: update.name,
        currentVersion: update.currentVersion,
        latestVersion: update.latestVersion,
        migrationGuide: this.getMigrationGuide(update.name),
      })),
    };

    await fs.writeFile('breaking-changes-report.json', JSON.stringify(report, null, 2));

    console.log('\n📋 Breaking Changes Report:');
    for (const update of updates) {
      console.log(`  🔴 ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
      console.log(`     Migration guide: ${this.getMigrationGuide(update.name)}`);
    }
  }

  private getMigrationGuide(packageName: string): string {
    const guides: Record<string, string> = {
      jest: 'https://jestjs.io/docs/upgrading-to-jest29',
      '@testing-library/react': 'https://testing-library.com/docs/react-testing-library/migration/',
      '@playwright/test': 'https://playwright.dev/docs/release-notes',
    };

    return guides[packageName] || 'Check package changelog for migration instructions';
  }

  private async rollbackAllChanges(): Promise<void> {
    try {
      const backupPath = await fs.readFile('.dependency-backup-path', 'utf8');

      const files = ['package.json', 'pnpm-lock.yaml'];
      for (const file of files) {
        const backupFile = path.join(backupPath, file);
        const content = await fs.readFile(backupFile, 'utf8');
        await fs.writeFile(file, content);
      }

      execSync('pnpm install', { stdio: 'pipe' });
      console.log('✅ Successfully rolled back all changes');
    } catch (error) {
      console.error('❌ Failed to rollback changes:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Remove temporary files
      await fs.unlink('.dependency-backup-path').catch(() => {});

      // Keep only the 5 most recent backups
      const backups = await fs.readdir(this.backupDir);
      const sortedBackups = backups.sort().reverse();

      for (const backup of sortedBackups.slice(5)) {
        await fs.rm(path.join(this.backupDir, backup), { recursive: true });
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  async generateUpdateReport(result: UpdateResult): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      success: result.success,
      summary: {
        updated: result.updated.length,
        failed: result.failed.length,
        rolledBack: result.rollbacks.length,
        testsPassed: result.testsPassed,
      },
      details: {
        updated: result.updated,
        failed: result.failed,
        rollbacks: result.rollbacks,
      },
    };

    await fs.writeFile('dependency-update-report.json', JSON.stringify(report, null, 2));

    console.log('\n📊 DEPENDENCY UPDATE REPORT');
    console.log('='.repeat(40));
    console.log(`✅ Updated: ${result.updated.length} packages`);
    console.log(`❌ Failed: ${result.failed.length} packages`);
    console.log(`🔄 Rolled back: ${result.rollbacks.length} packages`);
    console.log(`🧪 Tests passed: ${result.testsPassed ? 'Yes' : 'No'}`);
    console.log(`📋 Overall success: ${result.success ? 'Yes' : 'No'}`);

    if (result.updated.length > 0) {
      console.log('\nUpdated packages:');
      result.updated.forEach(pkg => console.log(`  • ${pkg}`));
    }

    if (result.failed.length > 0) {
      console.log('\nFailed packages:');
      result.failed.forEach(pkg => console.log(`  • ${pkg}`));
    }
  }
}

// CLI Interface
async function main() {
  const updater = new TestDependencyUpdater();

  try {
    const result = await updater.updateDependencies();
    await updater.generateUpdateReport(result);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Dependency update process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TestDependencyUpdater };
