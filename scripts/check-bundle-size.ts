#!/usr/bin/env tsx
/**
 * Bundle size budget enforcement.
 *
 * Compares the current `pnpm build` output against `docs/bundle-baseline.json`.
 * - Warns  at >=10% First Load JS growth on any tracked route.
 * - Blocks at >=20% growth (exit 1).
 *
 * Usage:
 *   pnpm build 2>&1 | tee bundle-output.log
 *   pnpm tsx scripts/check-bundle-size.ts
 *
 *   pnpm tsx scripts/check-bundle-size.ts --log path/to/build.log
 *   pnpm tsx scripts/check-bundle-size.ts --update-baseline
 *
 * Note: do NOT write the build log under .next/ — Next.js wipes that
 * directory early in the build, orphaning the tee file handle and
 * leaving no file on disk by the time this script runs.
 *
 * Sprint 5.2 in docs/ROADMAP_2026_Q2_DEFERRED.md.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const WARN_THRESHOLD = 0.1;
const BLOCK_THRESHOLD = 0.2;
const BASELINE_PATH = 'docs/bundle-baseline.json';
const DEFAULT_LOG_PATH = 'bundle-output.log';

interface BaselineRoute {
  size?: string;
  firstLoadJS: string;
  revalidate?: string;
  type?: string;
}

interface Baseline {
  date: string;
  nextVersion: string;
  buildTool: string;
  sharedJS: { total: string; chunks: Record<string, string> };
  middleware: string;
  keyPages: Record<string, BaselineRoute>;
  largestPages: Array<{ route: string; firstLoadJS: string }>;
  notes?: string;
}

interface RouteSize {
  route: string;
  firstLoadKB: number;
}

const ARGS = new Set(process.argv.slice(2));
const logPathArg = (() => {
  const idx = process.argv.indexOf('--log');
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : DEFAULT_LOG_PATH;
})();
const updateBaseline = ARGS.has('--update-baseline');

/** Convert "236 kB" / "1.2 MB" / "152kB" → number of kB. */
function parseSize(input: string): number {
  const match = input.trim().match(/^([\d.]+)\s*([kKmMgG]?)B$/);
  if (!match) throw new Error(`unparseable size: "${input}"`);
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return value * 1024;
  if (unit === 'g') return value * 1024 * 1024;
  if (unit === 'k') return value;
  return value / 1024; // bare "B"
}

/** Format kB number as "236 kB" / "1.2 MB" using Next's convention. */
function formatSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
  if (kb >= 100) return `${Math.round(kb)} kB`;
  return `${kb.toFixed(1)} kB`;
}

/**
 * Parse the textual table Next prints at the end of a build. Lines look like:
 *   ┌ ○ /                                       2.3 kB         236 kB
 *   ├ ○ /products                              2.54 kB         275 kB
 *   ├ ƒ /api/checkout                            136 B         0 kB
 * Box-drawing chars + the type marker (○ ● λ ƒ) appear before the route.
 */
function parseBuildLog(content: string): RouteSize[] {
  const routes: RouteSize[] = [];
  const lines = content.split('\n');
  // Allow "kB" / "MB" / "GB" / bare "B" with optional decimal.
  const sizeRe = /([\d.]+\s*[kKmMgG]?B)/g;

  for (const raw of lines) {
    // Strip box-drawing chars and type markers, then trim.
    const stripped = raw.replace(/[│┌├└─┐┘├┤┬┴┼○●λƒ]/g, ' ').trim();
    if (!stripped) continue;

    // Routes always start with "/" — skip header/footer/summary lines.
    if (!stripped.startsWith('/')) continue;

    const sizes = stripped.match(sizeRe);
    // Need at least two sizes (Size + First Load JS). Some rows (API routes)
    // emit "First Load JS" only — those are skipped (firstLoad ~ 0 anyway).
    if (!sizes || sizes.length < 2) continue;

    // Route token is the first whitespace-separated chunk.
    const route = stripped.split(/\s+/)[0];
    // Last size is First Load JS.
    const firstLoadKB = parseSize(sizes[sizes.length - 1]);
    routes.push({ route, firstLoadKB });
  }
  return routes;
}

interface Comparison {
  route: string;
  baselineKB: number;
  currentKB: number;
  deltaPct: number;
  status: 'ok' | 'warn' | 'block' | 'missing';
}

function compare(baseline: Baseline, current: RouteSize[]): Comparison[] {
  const byRoute = new Map(current.map((r) => [r.route, r.firstLoadKB] as const));
  const tracked = new Map<string, number>();
  for (const [route, info] of Object.entries(baseline.keyPages)) {
    tracked.set(route, parseSize(info.firstLoadJS));
  }
  for (const { route, firstLoadJS } of baseline.largestPages) {
    if (!tracked.has(route)) tracked.set(route, parseSize(firstLoadJS));
  }

  const results: Comparison[] = [];
  for (const [route, baselineKB] of tracked) {
    const currentKB = byRoute.get(route);
    if (currentKB === undefined) {
      results.push({ route, baselineKB, currentKB: 0, deltaPct: 0, status: 'missing' });
      continue;
    }
    const deltaPct = (currentKB - baselineKB) / baselineKB;
    let status: Comparison['status'] = 'ok';
    if (deltaPct >= BLOCK_THRESHOLD) status = 'block';
    else if (deltaPct >= WARN_THRESHOLD) status = 'warn';
    results.push({ route, baselineKB, currentKB, deltaPct, status });
  }
  return results.sort((a, b) => b.deltaPct - a.deltaPct);
}

function renderTable(rows: Comparison[]): string {
  const head = '| Route | Baseline | Current | Delta | Status |\n|---|---|---|---|---|';
  const body = rows
    .map((r) => {
      const icon =
        r.status === 'block'
          ? '🔴 block'
          : r.status === 'warn'
            ? '🟡 warn'
            : r.status === 'missing'
              ? '⚪ missing'
              : '🟢 ok';
      const delta = r.status === 'missing' ? '—' : `${(r.deltaPct * 100).toFixed(1)}%`;
      const current = r.status === 'missing' ? '—' : formatSize(r.currentKB);
      return `| \`${r.route}\` | ${formatSize(r.baselineKB)} | ${current} | ${delta} | ${icon} |`;
    })
    .join('\n');
  return `${head}\n${body}`;
}

async function writeStepSummary(table: string, summary: string): Promise<void> {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  await fs.appendFile(target, `## Bundle size check\n\n${summary}\n\n${table}\n`);
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const baselineFile = path.resolve(cwd, BASELINE_PATH);
  const logFile = path.resolve(cwd, logPathArg);

  let raw: string;
  try {
    raw = await fs.readFile(logFile, 'utf8');
  } catch (err) {
    console.error(
      `\n❌ Could not read build log at ${logPathArg}.\n` +
        `   Run \`pnpm build 2>&1 | tee ${DEFAULT_LOG_PATH}\` first, or pass --log <path>.\n`
    );
    process.exit(2);
  }

  const current = parseBuildLog(raw);
  if (current.length === 0) {
    console.error(
      `\n❌ No routes parsed from ${logPathArg}. The build log may be incomplete or the\n` +
        `   Next output format may have changed. Check the file manually.\n`
    );
    process.exit(2);
  }

  if (updateBaseline) {
    const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8')) as Baseline;
    for (const [route, info] of Object.entries(baseline.keyPages)) {
      const found = current.find((r) => r.route === route);
      if (found) info.firstLoadJS = formatSize(found.firstLoadKB);
    }
    baseline.largestPages = baseline.largestPages.map(({ route }) => {
      const found = current.find((r) => r.route === route);
      return { route, firstLoadJS: found ? formatSize(found.firstLoadKB) : '?' };
    });
    baseline.date = new Date().toISOString().slice(0, 10);
    await fs.writeFile(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`✅ Baseline updated → ${BASELINE_PATH}`);
    return;
  }

  const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8')) as Baseline;
  const rows = compare(baseline, current);
  const blocked = rows.filter((r) => r.status === 'block');
  const warned = rows.filter((r) => r.status === 'warn');

  const summary =
    blocked.length > 0
      ? `❌ ${blocked.length} route(s) exceed the 20% block threshold.`
      : warned.length > 0
        ? `⚠️  ${warned.length} route(s) exceed the 10% warn threshold (build allowed).`
        : `✅ All tracked routes within budget.`;

  const table = renderTable(rows);
  console.log(`\n${summary}\n\n${table}\n`);
  await writeStepSummary(table, summary);

  if (blocked.length > 0) {
    console.error(
      `\nTo accept these increases, run \`pnpm tsx scripts/check-bundle-size.ts --update-baseline\`\n` +
        `and commit the regenerated docs/bundle-baseline.json in the same PR.\n`
    );
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error('check-bundle-size: unexpected error');
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(2);
});
