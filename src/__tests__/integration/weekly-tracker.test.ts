import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(ROOT, 'scripts/generate-weekly-tracker.ts');
const IMPORT_SCRIPT = path.join(ROOT, 'scripts/import-csv-tracker.ts');
let tmpDir: string;

function run(cmd: string): string {
  // Clear JEST_WORKER_ID so the scripts' CLI entrypoint guard doesn't block execution
  const env = { ...process.env };
  delete env.JEST_WORKER_ID;
  delete env.VITEST;

  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: '/bin/bash',
    timeout: 30000,
    env,
  }).trim();
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-test-'));
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe('Weekly Tracker Integration', () => {
  describe('generate-weekly-tracker.ts --all', () => {
    const outputFile = () => path.join(tmpDir, 'tracker-all.md');

    it('generates a report from full git history', () => {
      run(`npx tsx ${SCRIPT} --all --output ${outputFile()}`);

      expect(fs.existsSync(outputFile())).toBe(true);
      const content = fs.readFileSync(outputFile(), 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });

    it('contains the expected header', () => {
      const content = fs.readFileSync(outputFile(), 'utf-8');
      expect(content).toContain('# Destino SF - Weekly Project Tracker');
      expect(content).toContain('**Project:** Destino SF E-Commerce Platform');
    });

    it('contains at least one week section', () => {
      const content = fs.readFileSync(outputFile(), 'utf-8');
      const weekSections = content.match(/## Week of /g);
      expect(weekSections).not.toBeNull();
      expect(weekSections!.length).toBeGreaterThan(0);
    });

    it('contains summary statistics', () => {
      const content = fs.readFileSync(outputFile(), 'utf-8');
      expect(content).toContain('## Summary Statistics');
      expect(content).toContain('Total Weeks Tracked');
      expect(content).toContain('Total Commits');
      expect(content).toContain('Phase Breakdown (All Time)');
    });

    it('has well-formed markdown tables', () => {
      const content = fs.readFileSync(outputFile(), 'utf-8');
      const tableRows = content
        .split('\n')
        .filter((line) => line.startsWith('|') && line.includes('|'));

      expect(tableRows.length).toBeGreaterThan(5);

      // Check that all table rows have consistent column count within their section
      for (const row of tableRows) {
        const cols = row.split('|').length;
        // Table rows should have at least 3 columns (including empty edges)
        expect(cols).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('idempotency', () => {
    it('produces identical output when run twice', () => {
      const out1 = path.join(tmpDir, 'idem-1.md');
      const out2 = path.join(tmpDir, 'idem-2.md');

      run(
        `npx tsx ${SCRIPT} --since "2026-03-01" --until "2026-04-01" --output ${out1}`
      );
      run(
        `npx tsx ${SCRIPT} --since "2026-03-01" --until "2026-04-01" --output ${out2}`
      );

      const content1 = fs.readFileSync(out1, 'utf-8');
      const content2 = fs.readFileSync(out2, 'utf-8');

      // Remove the Generated date line which changes
      const normalize = (s: string) =>
        s.replace(/\*\*Generated:\*\* .+/g, '**Generated:** DATE');

      expect(normalize(content1)).toBe(normalize(content2));
    });
  });

  describe('date range filtering', () => {
    it('only includes commits within the specified range', () => {
      const out = path.join(tmpDir, 'range.md');
      run(
        `npx tsx ${SCRIPT} --since "2026-04-01" --until "2026-04-10" --output ${out}`
      );

      const content = fs.readFileSync(out, 'utf-8');

      // Should contain April 2026 data
      if (content.includes('## Week of')) {
        expect(content).toMatch(/Apr(il)?\s+\d/);
      }

      // Should NOT contain data from January or earlier
      expect(content).not.toContain('## Week of Jan');
      expect(content).not.toContain('## Week of Feb');
    });
  });

  describe('CSV import', () => {
    it('imports CSV data and appends to tracker', () => {
      // Create a test CSV fixture
      const csvFile = path.join(tmpDir, 'test-tracker.csv');
      const trackerFile = path.join(tmpDir, 'tracker-csv.md');

      const csvContent = [
        'Date ,Month ,Coverage,Name ,Team Member,Phase,Task,Start Time ,End  TIme ,Duration (hrs),Status',
        '3/17/25,March,,Emman ,PM/Full Stack,Discovery & Planning,"Planning, research",,,10:00:00,Completed',
        '3/18/25,March,,Fernando ,Frontend Dev,Discovery & Planning,"Site structure planning",,,2:00:00,Completed',
        '3/21/25,March,,Isabela,Designer,Discovery & Planning,"Brand audit, design research",,,3:00:00,Completed',
      ].join('\n');

      fs.writeFileSync(csvFile, csvContent);

      // First generate a base tracker
      run(
        `npx tsx ${SCRIPT} --since "2026-04-01" --until "2026-04-10" --output ${trackerFile}`
      );

      // Then import CSV
      run(
        `npx tsx ${IMPORT_SCRIPT} --csv ${csvFile} --output ${trackerFile}`
      );

      const content = fs.readFileSync(trackerFile, 'utf-8');

      // Should have the CSV section
      expect(content).toContain('Historical Data (Imported from CSV)');
      expect(content).toContain('from CSV');

      // Should include all three team members
      expect(content).toContain('Emman');
      expect(content).toContain('Fernando');
      expect(content).toContain('Isabela');

      // Should use actual hours from CSV
      expect(content).toContain('10.0');
      expect(content).toContain('actual hours');
    });

    it('replaces existing CSV section on re-import', () => {
      const csvFile = path.join(tmpDir, 'test-tracker2.csv');
      const trackerFile = path.join(tmpDir, 'tracker-reimport.md');

      const csvContent = [
        'Date ,Month ,Coverage,Name ,Team Member,Phase,Task,Start Time ,End  TIme ,Duration (hrs),Status',
        '3/17/25,March,,Emman ,PM/Full Stack,Development,Task A,,,5:00:00,Completed',
      ].join('\n');

      fs.writeFileSync(csvFile, csvContent);

      // Create base file with CSV section already
      const baseContent =
        '# Tracker\n\n## Historical Data (Imported from CSV)\n\nOld data here\n';
      fs.writeFileSync(trackerFile, baseContent);

      // Import should replace, not duplicate
      run(
        `npx tsx ${IMPORT_SCRIPT} --csv ${csvFile} --output ${trackerFile}`
      );

      const content = fs.readFileSync(trackerFile, 'utf-8');
      const csvMarkerCount = (
        content.match(/Historical Data \(Imported from CSV\)/g) || []
      ).length;

      expect(csvMarkerCount).toBe(1);
      expect(content).not.toContain('Old data here');
    });
  });
});
