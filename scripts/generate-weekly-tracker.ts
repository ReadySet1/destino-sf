#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  eachWeekOfInterval,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedCommit {
  hash: string;
  author: string;
  date: Date;
  subject: string;
  type: string;
  scope: string;
  description: string;
  phase: string;
}

export interface NormalizedAuthor {
  name: string;
  role: string;
}

export interface WeekGroup {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  month: string;
  commits: ParsedCommit[];
}

export interface WeekStats {
  totalCommits: number;
  estimatedHours: number;
  authorBreakdown: Record<string, number>;
  phaseBreakdown: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PHASE_MAP: Record<string, string> = {
  feat: 'Development',
  feature: 'Development',
  fix: 'Fix',
  hotfix: 'Fix',
  revert: 'Fix',
  debug: 'Fix',
  test: 'Testing & QA',
  perf: 'Performance',
  optimize: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation',
  chore: 'Infrastructure',
  ci: 'Infrastructure',
  build: 'Infrastructure',
  style: 'UI/Design',
  security: 'Security',
};

const HOURS_MAP: Record<string, number> = {
  Development: 2.0,
  Fix: 1.5,
  'Testing & QA': 1.5,
  Performance: 1.5,
  Refactoring: 1.5,
  Security: 1.5,
  Documentation: 0.5,
  Infrastructure: 0.5,
  'UI/Design': 0.5,
  General: 1.0,
};

const AUTHOR_MAP: Record<string, NormalizedAuthor> = {
  'Emmanuel Alanis': { name: 'Emman', role: 'PM/Full Stack' },
  'Fernando Cardenas': { name: 'Fernando', role: 'Frontend Dev' },
  'fersanz-87': { name: 'Fernando', role: 'Frontend Dev' },
};

const SKIP_AUTHORS = new Set(['Ready Set LLC']);

// ─── Exported Functions ──────────────────────────────────────────────────────

export function parseCommitLine(line: string): ParsedCommit | null {
  const parts = line.split('|');
  if (parts.length < 4) return null;

  const [hash, author, dateStr, ...subjectParts] = parts;
  const subject = subjectParts.join('|'); // Handle | in commit messages

  if (!hash || !author || !dateStr || !subject) return null;

  // Git date format: "2026-04-09 13:04:45 -0600"
  // parseISO needs: "2026-04-09T13:04:45-0600"
  const normalizedDate = dateStr
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{4})$/, '$1T$2$3');
  const date = parseISO(normalizedDate);
  if (isNaN(date.getTime())) return null;

  const { type, scope, description } = extractCommitType(subject.trim());
  const phase = mapTypeToPhase(type);

  return {
    hash: hash.trim().substring(0, 7),
    author: author.trim(),
    date,
    subject: subject.trim(),
    type,
    scope,
    description,
    phase,
  };
}

export function extractCommitType(subject: string): {
  type: string;
  scope: string;
  description: string;
} {
  // Angular-style: type(scope): description  or  type: description
  const match = subject.match(/^([a-z+]+)(?:\(([^)]*)\))?:\s*(.*)/i);
  if (match) {
    const rawType = match[1].toLowerCase();
    // Handle compound types like perf+quality — use first
    const type = rawType.split('+')[0];
    return {
      type,
      scope: match[2] || '',
      description: match[3] || subject,
    };
  }

  return { type: '', scope: '', description: subject };
}

export function mapTypeToPhase(type: string): string {
  if (!type) return 'General';
  return PHASE_MAP[type] || 'General';
}

export function normalizeAuthor(gitAuthor: string): NormalizedAuthor | null {
  if (SKIP_AUTHORS.has(gitAuthor)) return null;

  const mapped = AUTHOR_MAP[gitAuthor];
  if (mapped) return mapped;

  // Unknown author — use git name as-is
  return { name: gitAuthor, role: 'Contributor' };
}

export function estimateHours(phase: string): number {
  return HOURS_MAP[phase] ?? 1.0;
}

export function isMergeCommit(subject: string): boolean {
  return /^Merge\s+(branch|pull request|remote)/i.test(subject);
}

export function groupByWeek(commits: ParsedCommit[]): WeekGroup[] {
  if (commits.length === 0) return [];

  const weekMap = new Map<string, ParsedCommit[]>();

  for (const commit of commits) {
    const ws = startOfWeek(commit.date, { weekStartsOn: 1 }); // Monday
    const key = format(ws, 'yyyy-MM-dd');
    const existing = weekMap.get(key) || [];
    existing.push(commit);
    weekMap.set(key, existing);
  }

  const weeks: WeekGroup[] = [];
  for (const [key, weekCommits] of weekMap) {
    const ws = parseISO(key);
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    weeks.push({
      weekStart: ws,
      weekEnd: we,
      label: `${format(ws, 'MMM d')} - ${format(we, 'MMM d, yyyy')}`,
      month: format(ws, 'MMMM yyyy'),
      commits: weekCommits.sort((a, b) => b.date.getTime() - a.date.getTime()),
    });
  }

  // Sort newest first
  return weeks.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
}

export function computeWeekStats(commits: ParsedCommit[]): WeekStats {
  const authorBreakdown: Record<string, number> = {};
  const phaseBreakdown: Record<string, number> = {};
  let totalHours = 0;

  for (const commit of commits) {
    const author = normalizeAuthor(commit.author);
    const displayName = author?.name || commit.author;
    authorBreakdown[displayName] = (authorBreakdown[displayName] || 0) + 1;
    phaseBreakdown[commit.phase] = (phaseBreakdown[commit.phase] || 0) + 1;
    totalHours += estimateHours(commit.phase);
  }

  return {
    totalCommits: commits.length,
    estimatedHours: totalHours,
    authorBreakdown,
    phaseBreakdown,
  };
}

export function generateWeekMarkdown(week: WeekGroup): string {
  const stats = computeWeekStats(week.commits);
  const lines: string[] = [];

  lines.push(`## Week of ${week.label}`);
  lines.push('');
  lines.push(`**Month:** ${week.month}`);
  lines.push('');
  lines.push('| Date | Author | Phase | Scope | Task | Commit |');
  lines.push('|------|--------|-------|-------|------|--------|');

  for (const commit of week.commits) {
    const author = normalizeAuthor(commit.author);
    const displayName = author?.name || commit.author;
    const dateStr = format(commit.date, 'MMM d');
    const desc =
      commit.description.length > 80
        ? commit.description.substring(0, 77) + '...'
        : commit.description;
    lines.push(
      `| ${dateStr} | ${displayName} | ${commit.phase} | ${commit.scope || '—'} | ${desc} | \`${commit.hash}\` |`
    );
  }

  lines.push('');

  // Summary line
  const authorSummary = Object.entries(stats.authorBreakdown)
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ');
  lines.push(
    `**Summary:** ${stats.totalCommits} commits | ~${stats.estimatedHours.toFixed(1)} est. hours | ${authorSummary}`
  );
  lines.push('');

  return lines.join('\n');
}

export function generateSummaryStats(weeks: WeekGroup[]): string {
  const allCommits = weeks.flatMap((w) => w.commits);
  const stats = computeWeekStats(allCommits);

  const lines: string[] = [];
  lines.push('## Summary Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Weeks Tracked | ${weeks.length} |`);
  lines.push(`| Total Commits | ${stats.totalCommits} |`);
  lines.push(
    `| Estimated Total Hours | ${stats.estimatedHours.toFixed(1)} |`
  );

  // Find most active phase
  const topPhase = Object.entries(stats.phaseBreakdown).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topPhase) {
    lines.push(
      `| Most Active Phase | ${topPhase[0]} (${topPhase[1]} commits) |`
    );
  }

  lines.push('');
  lines.push('### Phase Breakdown (All Time)');
  lines.push('');
  lines.push('| Phase | Commits | Est. Hours | % of Total |');
  lines.push('|-------|---------|------------|------------|');

  const sortedPhases = Object.entries(stats.phaseBreakdown).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [phase, count] of sortedPhases) {
    const hours = count * estimateHours(phase);
    const pct = ((count / stats.totalCommits) * 100).toFixed(1);
    lines.push(`| ${phase} | ${count} | ${hours.toFixed(1)} | ${pct}% |`);
  }

  lines.push('');
  return lines.join('\n');
}

export function generateFullReport(weeks: WeekGroup[]): string {
  const lines: string[] = [];

  lines.push('# Destino SF - Weekly Project Tracker');
  lines.push('');
  lines.push('**Project:** Destino SF E-Commerce Platform');
  lines.push(
    '**Team:** Emman (PM/Full Stack), Fernando (Frontend Dev), Isabela (Designer)'
  );
  lines.push(
    `**Generated:** ${format(new Date(), 'yyyy-MM-dd')} (auto-updated weekly)`
  );
  lines.push('');
  lines.push(
    '> Hours are estimated from commit activity. Actual hours may vary.'
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary stats
  lines.push(generateSummaryStats(weeks));
  lines.push('---');
  lines.push('');

  // Weekly sections
  for (const week of weeks) {
    lines.push(generateWeekMarkdown(week));
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Git Integration ─────────────────────────────────────────────────────────

function getGitCommits(since?: string, until?: string): ParsedCommit[] {
  const cmdParts = ['git log'];
  cmdParts.push("--format='%H|%an|%ai|%s'");
  if (since) cmdParts.push(`--since="${since}"`);
  if (until) cmdParts.push(`--until="${until}"`);
  cmdParts.push('--all');

  const output = execSync(cmdParts.join(' '), {
    encoding: 'utf-8',
    shell: '/bin/bash',
  }).trim();
  if (!output) return [];

  const commits: ParsedCommit[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const parsed = parseCommitLine(line);
    if (!parsed) continue;
    if (isMergeCommit(parsed.subject)) continue;
    if (!normalizeAuthor(parsed.author)) continue;
    commits.push(parsed);
  }

  return commits;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): {
  since?: string;
  until?: string;
  all: boolean;
  output: string;
} {
  const args = process.argv.slice(2);
  const result: { since?: string; until?: string; all: boolean; output: string } = {
    all: false,
    output: path.join(process.cwd(), 'docs', 'reports', 'WEEKLY_PROJECT_TRACKER.md'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--since':
        result.since = args[++i];
        break;
      case '--until':
        result.until = args[++i];
        break;
      case '--all':
        result.all = true;
        break;
      case '--output':
        result.output = args[++i];
        break;
    }
  }

  // Default to current week if no range specified and not --all
  if (!result.all && !result.since) {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    result.since = format(ws, 'yyyy-MM-dd');
  }

  return result;
}

function main(): void {
  console.log('📊 Generating Weekly Project Tracker...\n');

  const config = parseArgs();

  console.log(
    `  Range: ${config.all ? 'all history' : `${config.since || 'start'} → ${config.until || 'now'}`}`
  );
  console.log(`  Output: ${config.output}\n`);

  const commits = getGitCommits(
    config.all ? undefined : config.since,
    config.until
  );

  console.log(`  Found ${commits.length} commits (excluding merges)\n`);

  if (commits.length === 0) {
    console.log('  No commits found for the specified range.\n');
    return;
  }

  const weeks = groupByWeek(commits);
  const report = generateFullReport(weeks);

  // Ensure output directory exists
  const dir = path.dirname(config.output);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check for existing file and handle idempotent updates
  if (fs.existsSync(config.output)) {
    const existing = fs.readFileSync(config.output, 'utf-8');
    // If existing file has a CSV imported section, preserve it
    const csvMarker = '## Historical Data (Imported from CSV)';
    const csvIdx = existing.indexOf(csvMarker);
    if (csvIdx !== -1) {
      const csvSection = existing.substring(csvIdx);
      fs.writeFileSync(config.output, report + '\n' + csvSection, 'utf-8');
      console.log(
        `  ✅ Updated ${config.output} (preserved CSV history)\n`
      );
      return;
    }
  }

  fs.writeFileSync(config.output, report, 'utf-8');
  console.log(`  ✅ Generated ${config.output}\n`);
  console.log(`  📋 ${weeks.length} weeks | ${commits.length} commits`);
}

// Only run CLI when executed directly (not imported)
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].includes('generate-weekly-tracker') ||
    process.argv[1].endsWith('.ts'));

if (isDirectRun && !process.env.VITEST && !process.env.JEST_WORKER_ID) {
  main();
}
