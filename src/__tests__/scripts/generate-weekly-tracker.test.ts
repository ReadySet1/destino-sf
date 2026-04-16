import { describe, it, expect } from '@jest/globals';
import {
  parseCommitLine,
  extractCommitType,
  mapTypeToPhase,
  normalizeAuthor,
  estimateHours,
  isMergeCommit,
  groupByWeek,
  computeWeekStats,
  generateWeekMarkdown,
  generateSummaryStats,
  generateFullReport,
} from '../../../scripts/generate-weekly-tracker';
import type { ParsedCommit, WeekGroup } from '../../../scripts/generate-weekly-tracker';

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeCommit(overrides: Partial<ParsedCommit> = {}): ParsedCommit {
  return {
    hash: 'abc1234',
    author: 'Emmanuel Alanis',
    date: new Date('2026-04-09T13:00:00-0600'),
    subject: 'fix(db): resolve errors',
    type: 'fix',
    scope: 'db',
    description: 'resolve errors',
    phase: 'Fix',
    ...overrides,
  };
}

// ─── parseCommitLine ─────────────────────────────────────────────────────────

describe('parseCommitLine', () => {
  it('parses a valid Angular-style commit', () => {
    const line =
      'abc1234def|Emmanuel Alanis|2026-04-09 13:04:45 -0600|fix(db): resolve errors';
    const result = parseCommitLine(line);

    expect(result).not.toBeNull();
    expect(result!.hash).toBe('abc1234');
    expect(result!.author).toBe('Emmanuel Alanis');
    expect(result!.type).toBe('fix');
    expect(result!.scope).toBe('db');
    expect(result!.description).toBe('resolve errors');
    expect(result!.phase).toBe('Fix');
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.date.getFullYear()).toBe(2026);
  });

  it('parses a commit with no scope', () => {
    const line =
      'abc1234def|Emmanuel Alanis|2026-04-09 13:04:45 -0600|feat: add feature';
    const result = parseCommitLine(line);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('feat');
    expect(result!.scope).toBe('');
    expect(result!.description).toBe('add feature');
    expect(result!.phase).toBe('Development');
  });

  it('handles non-conventional commit messages', () => {
    const line =
      'abc1234def|Fernando Cardenas|2026-04-09 13:04:45 -0600|Updated homepage design';
    const result = parseCommitLine(line);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('');
    expect(result!.phase).toBe('General');
    expect(result!.description).toBe('Updated homepage design');
  });

  it('returns null for malformed lines', () => {
    expect(parseCommitLine('')).toBeNull();
    expect(parseCommitLine('not|enough')).toBeNull();
    expect(parseCommitLine('a|b|invalid-date|subject')).toBeNull();
  });

  it('handles pipe characters in commit subject', () => {
    const line =
      'abc1234def|Emmanuel Alanis|2026-04-09 13:04:45 -0600|fix: handle A | B case';
    const result = parseCommitLine(line);

    expect(result).not.toBeNull();
    expect(result!.description).toBe('handle A | B case');
  });

  it('truncates hash to 7 characters', () => {
    const line =
      'abc1234567890abcdef|Emmanuel Alanis|2026-04-09 13:04:45 -0600|fix: something';
    const result = parseCommitLine(line);

    expect(result!.hash).toBe('abc1234');
    expect(result!.hash.length).toBe(7);
  });
});

// ─── extractCommitType ───────────────────────────────────────────────────────

describe('extractCommitType', () => {
  it('extracts type and scope from Angular-style', () => {
    const result = extractCommitType('fix(db): resolve errors');
    expect(result.type).toBe('fix');
    expect(result.scope).toBe('db');
    expect(result.description).toBe('resolve errors');
  });

  it('extracts type without scope', () => {
    const result = extractCommitType('feat: new feature');
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('');
    expect(result.description).toBe('new feature');
  });

  it('handles compound types', () => {
    const result = extractCommitType('perf+quality: improve speed');
    expect(result.type).toBe('perf');
    expect(result.description).toBe('improve speed');
  });

  it('returns empty type for non-conventional messages', () => {
    const result = extractCommitType('Updated homepage design');
    expect(result.type).toBe('');
    expect(result.description).toBe('Updated homepage design');
  });
});

// ─── mapTypeToPhase ──────────────────────────────────────────────────────────

describe('mapTypeToPhase', () => {
  it.each([
    ['feat', 'Development'],
    ['feature', 'Development'],
    ['fix', 'Fix'],
    ['hotfix', 'Fix'],
    ['revert', 'Fix'],
    ['test', 'Testing & QA'],
    ['perf', 'Performance'],
    ['optimize', 'Performance'],
    ['refactor', 'Refactoring'],
    ['docs', 'Documentation'],
    ['chore', 'Infrastructure'],
    ['ci', 'Infrastructure'],
    ['build', 'Infrastructure'],
    ['style', 'UI/Design'],
    ['security', 'Security'],
  ])('maps "%s" to "%s"', (type, expected) => {
    expect(mapTypeToPhase(type)).toBe(expected);
  });

  it('maps unknown type to General', () => {
    expect(mapTypeToPhase('unknown')).toBe('General');
    expect(mapTypeToPhase('xyz')).toBe('General');
  });

  it('maps empty type to General', () => {
    expect(mapTypeToPhase('')).toBe('General');
  });
});

// ─── normalizeAuthor ─────────────────────────────────────────────────────────

describe('normalizeAuthor', () => {
  it('maps Emmanuel Alanis to Emman', () => {
    const result = normalizeAuthor('Emmanuel Alanis');
    expect(result).toEqual({ name: 'Emman', role: 'PM/Full Stack' });
  });

  it('maps Fernando Cardenas to Fernando', () => {
    const result = normalizeAuthor('Fernando Cardenas');
    expect(result).toEqual({ name: 'Fernando', role: 'Frontend Dev' });
  });

  it('maps fersanz-87 to Fernando', () => {
    const result = normalizeAuthor('fersanz-87');
    expect(result).toEqual({ name: 'Fernando', role: 'Frontend Dev' });
  });

  it('returns null for Ready Set LLC (bot)', () => {
    expect(normalizeAuthor('Ready Set LLC')).toBeNull();
  });

  it('uses git name as-is for unknown authors', () => {
    const result = normalizeAuthor('New Developer');
    expect(result).toEqual({ name: 'New Developer', role: 'Contributor' });
  });
});

// ─── estimateHours ───────────────────────────────────────────────────────────

describe('estimateHours', () => {
  it.each([
    ['Development', 2.0],
    ['Fix', 1.5],
    ['Testing & QA', 1.5],
    ['Performance', 1.5],
    ['Refactoring', 1.5],
    ['Security', 1.5],
    ['Documentation', 0.5],
    ['Infrastructure', 0.5],
    ['UI/Design', 0.5],
    ['General', 1.0],
  ])('returns %f hours for phase "%s"', (phase, expected) => {
    expect(estimateHours(phase)).toBe(expected);
  });

  it('returns 1.0 for unknown phase', () => {
    expect(estimateHours('Unknown Phase')).toBe(1.0);
  });
});

// ─── isMergeCommit ───────────────────────────────────────────────────────────

describe('isMergeCommit', () => {
  it('detects merge branch commits', () => {
    expect(isMergeCommit("Merge branch 'main' into development")).toBe(true);
  });

  it('detects merge pull request commits', () => {
    expect(isMergeCommit('Merge pull request #42 from owner/branch')).toBe(true);
  });

  it('detects merge remote commits', () => {
    expect(isMergeCommit('Merge remote-tracking branch origin/main')).toBe(true);
  });

  it('does not flag regular commits', () => {
    expect(isMergeCommit('fix(db): resolve merge conflict logic')).toBe(false);
    expect(isMergeCommit('feat: add merge sort algorithm')).toBe(false);
  });
});

// ─── groupByWeek ─────────────────────────────────────────────────────────────

describe('groupByWeek', () => {
  it('groups commits in the same week together', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 3, 6, 10) }), // Monday
      makeCommit({ date: new Date(2026, 3, 9, 10) }), // Thursday
    ];

    const weeks = groupByWeek(commits);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].commits).toHaveLength(2);
  });

  it('separates commits from different weeks', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 3, 6, 10) }), // Week 1
      makeCommit({ date: new Date(2026, 3, 13, 10) }), // Week 2
    ];

    const weeks = groupByWeek(commits);
    expect(weeks).toHaveLength(2);
  });

  it('sorts weeks newest first', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 2, 30, 10) }),
      makeCommit({ date: new Date(2026, 3, 13, 10) }),
      makeCommit({ date: new Date(2026, 3, 6, 10) }),
    ];

    const weeks = groupByWeek(commits);
    expect(weeks[0].weekStart.getTime()).toBeGreaterThan(
      weeks[1].weekStart.getTime()
    );
    expect(weeks[1].weekStart.getTime()).toBeGreaterThan(
      weeks[2].weekStart.getTime()
    );
  });

  it('returns empty array for no commits', () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it('Sunday commit belongs to the same week as Monday', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 3, 6, 10) }), // Monday
      makeCommit({ date: new Date(2026, 3, 12, 10) }), // Sunday
    ];

    const weeks = groupByWeek(commits);
    expect(weeks).toHaveLength(1);
  });

  it('sorts commits within a week newest first', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 3, 6, 10), hash: 'mon1234' }),
      makeCommit({ date: new Date(2026, 3, 9, 10), hash: 'thu1234' }),
    ];

    const weeks = groupByWeek(commits);
    expect(weeks[0].commits[0].hash).toBe('thu1234');
  });

  it('generates correct week label', () => {
    const commits = [
      makeCommit({ date: new Date(2026, 3, 6, 10) }),
    ];

    const weeks = groupByWeek(commits);
    expect(weeks[0].label).toMatch(/Apr 6 - Apr 12, 2026/);
    expect(weeks[0].month).toBe('April 2026');
  });
});

// ─── computeWeekStats ────────────────────────────────────────────────────────

describe('computeWeekStats', () => {
  it('computes correct stats', () => {
    const commits = [
      makeCommit({ author: 'Emmanuel Alanis', phase: 'Fix' }),
      makeCommit({ author: 'Emmanuel Alanis', phase: 'Development' }),
      makeCommit({ author: 'Fernando Cardenas', phase: 'Fix' }),
    ];

    const stats = computeWeekStats(commits);
    expect(stats.totalCommits).toBe(3);
    expect(stats.authorBreakdown['Emman']).toBe(2);
    expect(stats.authorBreakdown['Fernando']).toBe(1);
    expect(stats.phaseBreakdown['Fix']).toBe(2);
    expect(stats.phaseBreakdown['Development']).toBe(1);
    expect(stats.estimatedHours).toBe(1.5 + 2.0 + 1.5); // Fix + Dev + Fix
  });
});

// ─── generateWeekMarkdown ────────────────────────────────────────────────────

describe('generateWeekMarkdown', () => {
  it('generates valid markdown table', () => {
    const week: WeekGroup = {
      weekStart: new Date('2026-04-06'),
      weekEnd: new Date('2026-04-12'),
      label: 'Apr 6 - Apr 12, 2026',
      month: 'April 2026',
      commits: [
        makeCommit({
          date: new Date(2026, 3, 9, 10),
          description: 'resolve errors',
          scope: 'db',
          phase: 'Fix',
          hash: 'abc1234',
        }),
      ],
    };

    const md = generateWeekMarkdown(week);

    expect(md).toContain('## Week of Apr 6 - Apr 12, 2026');
    expect(md).toContain('**Month:** April 2026');
    expect(md).toContain('| Date | Author | Phase | Scope | Task | Commit |');
    expect(md).toContain('| Apr 9 | Emman | Fix | db | resolve errors | `abc1234` |');
    expect(md).toContain('**Summary:**');
    expect(md).toContain('1 commits');
  });

  it('truncates long descriptions to 80 chars', () => {
    const longDesc = 'A'.repeat(100);
    const week: WeekGroup = {
      weekStart: new Date('2026-04-06'),
      weekEnd: new Date('2026-04-12'),
      label: 'Apr 6 - Apr 12, 2026',
      month: 'April 2026',
      commits: [
        makeCommit({ description: longDesc }),
      ],
    };

    const md = generateWeekMarkdown(week);
    expect(md).toContain('...');
    // Should not contain the full 100-char string
    expect(md).not.toContain(longDesc);
  });

  it('shows dash for empty scope', () => {
    const week: WeekGroup = {
      weekStart: new Date('2026-04-06'),
      weekEnd: new Date('2026-04-12'),
      label: 'Apr 6 - Apr 12, 2026',
      month: 'April 2026',
      commits: [makeCommit({ scope: '' })],
    };

    const md = generateWeekMarkdown(week);
    expect(md).toContain('| — |');
  });
});

// ─── generateSummaryStats ────────────────────────────────────────────────────

describe('generateSummaryStats', () => {
  it('generates summary with correct totals', () => {
    const weeks: WeekGroup[] = [
      {
        weekStart: new Date('2026-04-06'),
        weekEnd: new Date('2026-04-12'),
        label: 'Apr 6 - Apr 12, 2026',
        month: 'April 2026',
        commits: [
          makeCommit({ phase: 'Fix' }),
          makeCommit({ phase: 'Development' }),
        ],
      },
      {
        weekStart: new Date('2026-03-30'),
        weekEnd: new Date('2026-04-05'),
        label: 'Mar 30 - Apr 5, 2026',
        month: 'March 2026',
        commits: [makeCommit({ phase: 'Fix' })],
      },
    ];

    const md = generateSummaryStats(weeks);

    expect(md).toContain('## Summary Statistics');
    expect(md).toContain('| Total Weeks Tracked | 2 |');
    expect(md).toContain('| Total Commits | 3 |');
    expect(md).toContain('### Phase Breakdown (All Time)');
    expect(md).toContain('| Fix |');
    expect(md).toContain('| Development |');
  });
});

// ─── generateFullReport ──────────────────────────────────────────────────────

describe('generateFullReport', () => {
  it('generates a complete report with header and sections', () => {
    const weeks: WeekGroup[] = [
      {
        weekStart: new Date('2026-04-06'),
        weekEnd: new Date('2026-04-12'),
        label: 'Apr 6 - Apr 12, 2026',
        month: 'April 2026',
        commits: [makeCommit()],
      },
    ];

    const report = generateFullReport(weeks);

    expect(report).toContain('# Destino SF - Weekly Project Tracker');
    expect(report).toContain('**Project:** Destino SF E-Commerce Platform');
    expect(report).toContain('## Summary Statistics');
    expect(report).toContain('## Week of Apr 6 - Apr 12, 2026');
    expect(report).toContain('Hours are estimated from commit activity');
  });
});
