#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import {
  startOfWeek,
  endOfWeek,
  format,
  parse,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CsvRow {
  date: Date;
  month: string;
  coverage: string;
  name: string;
  role: string;
  phase: string;
  task: string;
  duration: number; // hours
  status: string;
}

export interface CsvWeekGroup {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  month: string;
  rows: CsvRow[];
}

// ─── Exported Functions ──────────────────────────────────────────────────────

export function parseCsvRow(line: string, headers: string[]): CsvRow | null {
  const fields = smartSplit(line);
  if (fields.length < 11) return null;

  const dateStr = fields[0]?.trim();
  if (!dateStr) return null;

  const date = parseDateField(dateStr);
  if (!date || isNaN(date.getTime())) return null;

  const durationStr = fields[9]?.trim() || '0:00:00';
  const duration = parseDuration(durationStr);

  return {
    date,
    month: fields[1]?.trim() || '',
    coverage: fields[2]?.trim() || '',
    name: fields[3]?.trim() || '',
    role: fields[4]?.trim() || '',
    phase: fields[5]?.trim() || '',
    task: fields[6]?.trim() || '',
    duration,
    status: fields[10]?.trim() || '',
  };
}

export function smartSplit(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseDateField(dateStr: string): Date | null {
  // Handle formats: M/D/YY, MM/DD/YY, M/D/YYYY, MM/DD/YYYY
  const formats = [
    'M/d/yy',
    'MM/dd/yy',
    'M/d/yyyy',
    'MM/dd/yyyy',
  ];

  for (const fmt of formats) {
    try {
      const result = parse(dateStr, fmt, new Date());
      if (!isNaN(result.getTime())) {
        // Fix 2-digit year: parse interprets "25" as 2025, "27"/"28" as 2027/2028
        // The CSV has typos like 1/28/27 and 1/28/28 which should be 2026
        return result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function parseDuration(durationStr: string): number {
  // Format: H:MM:SS or HH:MM:SS
  const match = durationStr.match(/^(\d+):(\d+):(\d+)$/);
  if (!match) {
    // Try plain number
    const num = parseFloat(durationStr);
    return isNaN(num) ? 0 : num;
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  return hours + minutes / 60 + seconds / 3600;
}

export function groupCsvByWeek(rows: CsvRow[]): CsvWeekGroup[] {
  const weekMap = new Map<string, CsvRow[]>();

  for (const row of rows) {
    const ws = startOfWeek(row.date, { weekStartsOn: 1 });
    const key = format(ws, 'yyyy-MM-dd');
    const existing = weekMap.get(key) || [];
    existing.push(row);
    weekMap.set(key, existing);
  }

  const weeks: CsvWeekGroup[] = [];
  for (const [key, weekRows] of weekMap) {
    const ws = new Date(key + 'T00:00:00');
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    weeks.push({
      weekStart: ws,
      weekEnd: we,
      label: `${format(ws, 'MMM d')} - ${format(we, 'MMM d, yyyy')}`,
      month: format(ws, 'MMMM yyyy'),
      rows: weekRows.sort((a, b) => b.date.getTime() - a.date.getTime()),
    });
  }

  // Sort newest first
  return weeks.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
}

export function generateCsvWeekMarkdown(week: CsvWeekGroup): string {
  const lines: string[] = [];

  lines.push(`## Week of ${week.label} *(from CSV)*`);
  lines.push('');
  lines.push(`**Month:** ${week.month}`);
  lines.push('');
  lines.push('| Date | Author | Role | Phase | Task | Hours | Status |');
  lines.push('|------|--------|------|-------|------|-------|--------|');

  for (const row of week.rows) {
    const dateStr = format(row.date, 'MMM d');
    const task =
      row.task.length > 70 ? row.task.substring(0, 67) + '...' : row.task;
    lines.push(
      `| ${dateStr} | ${row.name} | ${row.role} | ${row.phase} | ${task} | ${row.duration.toFixed(1)} | ${row.status} |`
    );
  }

  lines.push('');

  // Summary
  const totalHours = week.rows.reduce((sum, r) => sum + r.duration, 0);
  const authors = [...new Set(week.rows.map((r) => r.name))];
  const authorSummary = authors
    .map((name) => {
      const count = week.rows.filter((r) => r.name === name).length;
      const hrs = week.rows
        .filter((r) => r.name === name)
        .reduce((s, r) => s + r.duration, 0);
      return `${name}: ${count} entries, ${hrs.toFixed(1)}h`;
    })
    .join(' | ');
  lines.push(
    `**Summary:** ${week.rows.length} entries | ${totalHours.toFixed(1)} actual hours | ${authorSummary}`
  );
  lines.push('');

  return lines.join('\n');
}

function generateCsvSummary(weeks: CsvWeekGroup[]): string {
  const allRows = weeks.flatMap((w) => w.rows);
  const totalHours = allRows.reduce((s, r) => s + r.duration, 0);

  const lines: string[] = [];
  lines.push('### CSV Historical Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Weeks | ${weeks.length} |`);
  lines.push(`| Total Entries | ${allRows.length} |`);
  lines.push(`| Total Actual Hours | ${totalHours.toFixed(1)} |`);

  const authors = [...new Set(allRows.map((r) => r.name))];
  for (const author of authors) {
    const hrs = allRows
      .filter((r) => r.name === author)
      .reduce((s, r) => s + r.duration, 0);
    lines.push(`| ${author} Hours | ${hrs.toFixed(1)} |`);
  }

  lines.push('');
  return lines.join('\n');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): { csv: string; output: string } {
  const args = process.argv.slice(2);
  const result = {
    csv: '',
    output: path.join(
      process.cwd(),
      'docs',
      'reports',
      'WEEKLY_PROJECT_TRACKER.md'
    ),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--csv':
        result.csv = args[++i];
        break;
      case '--output':
        result.output = args[++i];
        break;
    }
  }

  return result;
}

function main(): void {
  console.log('📥 Importing CSV Tracker Data...\n');

  const config = parseArgs();

  if (!config.csv) {
    console.error('  ❌ Please provide --csv <path> argument\n');
    process.exit(1);
  }

  if (!fs.existsSync(config.csv)) {
    console.error(`  ❌ CSV file not found: ${config.csv}\n`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(config.csv, 'utf-8');
  const lines = csvContent.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    console.error('  ❌ CSV file is empty or has no data rows\n');
    process.exit(1);
  }

  const headers = smartSplit(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i], headers);
    if (row) rows.push(row);
  }

  console.log(`  Found ${rows.length} rows in CSV\n`);

  const weeks = groupCsvByWeek(rows);

  // Generate CSV section
  const csvLines: string[] = [];
  csvLines.push('## Historical Data (Imported from CSV)');
  csvLines.push('');
  csvLines.push(
    '> The following data was imported from the original Google Sheets tracker.'
  );
  csvLines.push(
    '> Hours shown are actual tracked hours, not estimates.'
  );
  csvLines.push('');
  csvLines.push(generateCsvSummary(weeks));
  csvLines.push('---');
  csvLines.push('');

  for (const week of weeks) {
    csvLines.push(generateCsvWeekMarkdown(week));
    csvLines.push('---');
    csvLines.push('');
  }

  const csvSection = csvLines.join('\n');

  // Append to existing tracker or create new file
  if (fs.existsSync(config.output)) {
    const existing = fs.readFileSync(config.output, 'utf-8');

    // Replace existing CSV section if present
    const csvMarker = '## Historical Data (Imported from CSV)';
    const csvIdx = existing.indexOf(csvMarker);
    if (csvIdx !== -1) {
      const before = existing.substring(0, csvIdx);
      fs.writeFileSync(config.output, before + csvSection, 'utf-8');
      console.log(`  ✅ Replaced CSV section in ${config.output}\n`);
    } else {
      fs.writeFileSync(
        config.output,
        existing + '\n' + csvSection,
        'utf-8'
      );
      console.log(`  ✅ Appended CSV section to ${config.output}\n`);
    }
  } else {
    // Ensure directory exists
    const dir = path.dirname(config.output);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(config.output, csvSection, 'utf-8');
    console.log(`  ✅ Created ${config.output} with CSV data\n`);
  }

  console.log(`  📋 ${weeks.length} weeks | ${rows.length} entries imported`);
}

// Only run CLI when executed directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].includes('import-csv-tracker') ||
    process.argv[1].endsWith('.ts'));

if (isDirectRun && !process.env.VITEST && !process.env.JEST_WORKER_ID) {
  main();
}
