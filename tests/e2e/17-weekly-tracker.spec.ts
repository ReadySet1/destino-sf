import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

/**
 * E2E Tests for Weekly Project Tracker
 *
 * Validates:
 * 1. GitHub Actions workflow configuration
 * 2. Script CLI execution and output correctness
 */
test.describe('Weekly Project Tracker E2E', () => {
  test.describe('GitHub Actions Workflow Validation', () => {
    let workflowContent: string;
    let workflow: Record<string, unknown>;

    test.beforeAll(() => {
      const workflowPath = path.join(
        ROOT,
        '.github/workflows/weekly-tracker.yml'
      );
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      workflow = yaml.parse(workflowContent);
    });

    test('workflow file exists and is valid YAML', () => {
      expect(workflow).toBeDefined();
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('on');
      expect(workflow).toHaveProperty('jobs');
    });

    test('has correct cron schedule (every Monday at 9 AM UTC)', () => {
      const on = workflow.on as Record<string, unknown>;
      expect(on).toHaveProperty('schedule');

      const schedule = on.schedule as Array<{ cron: string }>;
      expect(schedule).toHaveLength(1);
      expect(schedule[0].cron).toBe('0 9 * * 1');
    });

    test('supports manual workflow_dispatch trigger', () => {
      const on = workflow.on as Record<string, unknown>;
      expect(on).toHaveProperty('workflow_dispatch');
    });

    test('uses fetch-depth: 0 for full git history', () => {
      // Check raw content since YAML parsing may lose structure
      expect(workflowContent).toContain('fetch-depth: 0');
    });

    test('has contents: write permission for auto-commit', () => {
      const permissions = workflow.permissions as Record<string, string>;
      expect(permissions).toHaveProperty('contents', 'write');
    });

    test('commits with correct message pattern', () => {
      expect(workflowContent).toContain(
        'docs: update weekly project tracker'
      );
    });

    test('guards against empty commits', () => {
      expect(workflowContent).toContain('git diff --staged --quiet');
    });
  });

  test.describe('Script CLI Validation', () => {
    let tmpDir: string;

    test.beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-e2e-'));
    });

    test.afterAll(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('pnpm tracker executes successfully', () => {
      const outputFile = path.join(tmpDir, 'e2e-tracker.md');

      const result = execSync(
        `npx tsx scripts/generate-weekly-tracker.ts --since "2026-04-01" --until "2026-04-10" --output ${outputFile}`,
        {
          cwd: ROOT,
          encoding: 'utf-8',
          shell: '/bin/bash',
          timeout: 30000,
        }
      );

      expect(result).toContain('Generating Weekly Project Tracker');
    });

    test('output file is valid markdown', () => {
      const outputFile = path.join(tmpDir, 'e2e-tracker.md');

      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, 'utf-8');

        // Must start with a markdown heading
        expect(content).toMatch(/^# /);

        // Must contain proper table separators
        expect(content).toContain('|---');

        // Must not contain broken markdown (unclosed tables, etc.)
        const lines = content.split('\n');
        const tableRows = lines.filter(
          (l) => l.startsWith('|') && !l.startsWith('|---')
        );

        for (const row of tableRows) {
          // Each table row should start and end with |
          expect(row.trimEnd()).toMatch(/^\|.*\|$/);
        }
      }
    });

    test('--all flag generates comprehensive report', () => {
      const outputFile = path.join(tmpDir, 'e2e-all.md');

      execSync(
        `npx tsx scripts/generate-weekly-tracker.ts --all --output ${outputFile}`,
        {
          cwd: ROOT,
          encoding: 'utf-8',
          shell: '/bin/bash',
          timeout: 60000,
        }
      );

      expect(fs.existsSync(outputFile)).toBe(true);

      const content = fs.readFileSync(outputFile, 'utf-8');
      const weekCount = (content.match(/## Week of /g) || []).length;

      // Should have many weeks of history
      expect(weekCount).toBeGreaterThan(10);

      // Should have summary stats
      expect(content).toContain('Total Weeks Tracked');
      expect(content).toContain('Estimated Total Hours');
    });
  });
});
