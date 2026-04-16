import { describe, it, expect } from '@jest/globals';
import {
  parseCsvRow,
  smartSplit,
  parseDateField,
  parseDuration,
  groupCsvByWeek,
  generateCsvWeekMarkdown,
} from '../../../scripts/import-csv-tracker';
import type { CsvRow, CsvWeekGroup } from '../../../scripts/import-csv-tracker';

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    date: new Date('2025-04-06T00:00:00'),
    month: 'April',
    coverage: '04/06 - 04/12',
    name: 'Emman',
    role: 'PM/Full Stack',
    phase: 'Development',
    task: 'Backend setup',
    duration: 7.0,
    status: 'Completed',
    ...overrides,
  };
}

// ─── smartSplit ──────────────────────────────────────────────────────────────

describe('smartSplit', () => {
  it('splits simple CSV fields', () => {
    const result = smartSplit('a,b,c');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas', () => {
    const result = smartSplit('a,"b,c",d');
    expect(result).toEqual(['a', 'b,c', 'd']);
  });

  it('handles empty fields', () => {
    const result = smartSplit('a,,c');
    expect(result).toEqual(['a', '', 'c']);
  });

  it('handles trailing comma', () => {
    const result = smartSplit('a,b,');
    expect(result).toEqual(['a', 'b', '']);
  });
});

// ─── parseDateField ──────────────────────────────────────────────────────────

describe('parseDateField', () => {
  it('parses M/D/YY format', () => {
    const date = parseDateField('3/17/25');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(2); // March = 2
    expect(date!.getDate()).toBe(17);
  });

  it('parses MM/DD/YY format', () => {
    const date = parseDateField('12/01/25');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(11); // December
  });

  it('parses M/D/YYYY format', () => {
    const date = parseDateField('3/17/2025');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
  });

  it('returns null for invalid dates', () => {
    expect(parseDateField('')).toBeNull();
    expect(parseDateField('not-a-date')).toBeNull();
  });
});

// ─── parseDuration ───────────────────────────────────────────────────────────

describe('parseDuration', () => {
  it('parses H:MM:SS format', () => {
    expect(parseDuration('7:00:00')).toBe(7.0);
    expect(parseDuration('10:00:00')).toBe(10.0);
  });

  it('parses with minutes and seconds', () => {
    expect(parseDuration('7:30:00')).toBe(7.5);
    expect(parseDuration('1:15:00')).toBeCloseTo(1.25);
  });

  it('handles HH:MM:SS format', () => {
    expect(parseDuration('02:00:00')).toBe(2.0);
  });

  it('handles plain numbers', () => {
    expect(parseDuration('5')).toBe(5);
  });

  it('returns 0 for invalid input', () => {
    expect(parseDuration('')).toBe(0);
    expect(parseDuration('invalid')).toBe(0);
  });
});

// ─── parseCsvRow ─────────────────────────────────────────────────────────────

describe('parseCsvRow', () => {
  const headers = [
    'Date',
    'Month',
    'Coverage',
    'Name',
    'Team Member',
    'Phase',
    'Task',
    'Start Time',
    'End Time',
    'Duration (hrs)',
    'Status',
  ];

  it('parses a valid CSV row', () => {
    const line =
      '3/17/25,March,,Emman ,PM/Full Stack,Discovery & Planning,"Planning, research",,,10:00:00,Completed';
    const result = parseCsvRow(line, headers);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Emman');
    expect(result!.role).toBe('PM/Full Stack');
    expect(result!.phase).toBe('Discovery & Planning');
    expect(result!.task).toBe('Planning, research');
    expect(result!.duration).toBe(10.0);
    expect(result!.status).toBe('Completed');
  });

  it('returns null for rows with too few fields', () => {
    expect(parseCsvRow('a,b,c', headers)).toBeNull();
  });

  it('returns null for rows with invalid dates', () => {
    expect(
      parseCsvRow('invalid,,,,,,,,,,Completed', headers)
    ).toBeNull();
  });

  it('handles rows with missing duration', () => {
    const line = '3/17/25,March,,Emman,PM/Full Stack,Dev,Task,,,0:00:00,Completed';
    const result = parseCsvRow(line, headers);
    expect(result).not.toBeNull();
    expect(result!.duration).toBe(0);
  });
});

// ─── groupCsvByWeek ──────────────────────────────────────────────────────────

describe('groupCsvByWeek', () => {
  it('groups rows from the same week together', () => {
    const rows = [
      makeRow({ date: new Date(2025, 3, 7, 12) }), // Monday Apr 7 noon local
      makeRow({ date: new Date(2025, 3, 9, 12) }), // Wednesday Apr 9 noon local
    ];

    const weeks = groupCsvByWeek(rows);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].rows).toHaveLength(2);
  });

  it('separates rows from different weeks', () => {
    const rows = [
      makeRow({ date: new Date(2025, 3, 7, 12) }), // Week 1
      makeRow({ date: new Date(2025, 3, 14, 12) }), // Week 2
    ];

    const weeks = groupCsvByWeek(rows);
    expect(weeks).toHaveLength(2);
  });

  it('sorts weeks newest first', () => {
    const rows = [
      makeRow({ date: new Date(2025, 2, 17, 12) }),
      makeRow({ date: new Date(2025, 3, 14, 12) }),
      makeRow({ date: new Date(2025, 3, 7, 12) }),
    ];

    const weeks = groupCsvByWeek(rows);
    expect(weeks[0].weekStart.getTime()).toBeGreaterThan(
      weeks[1].weekStart.getTime()
    );
  });

  it('returns empty array for no rows', () => {
    expect(groupCsvByWeek([])).toEqual([]);
  });
});

// ─── generateCsvWeekMarkdown ─────────────────────────────────────────────────

describe('generateCsvWeekMarkdown', () => {
  it('generates markdown with (from CSV) tag', () => {
    const week: CsvWeekGroup = {
      weekStart: new Date('2025-04-07'),
      weekEnd: new Date('2025-04-13'),
      label: 'Apr 7 - Apr 13, 2025',
      month: 'April 2025',
      rows: [
        makeRow({ name: 'Emman', duration: 7.0, task: 'Backend setup' }),
      ],
    };

    const md = generateCsvWeekMarkdown(week);

    expect(md).toContain('*(from CSV)*');
    expect(md).toContain('## Week of Apr 7 - Apr 13, 2025');
    expect(md).toContain('**Month:** April 2025');
    expect(md).toContain('| Date | Author | Role | Phase | Task | Hours | Status |');
    expect(md).toContain('Backend setup');
    expect(md).toContain('7.0');
    expect(md).toContain('**Summary:**');
  });

  it('uses actual hours from CSV, not estimates', () => {
    const week: CsvWeekGroup = {
      weekStart: new Date('2025-04-07'),
      weekEnd: new Date('2025-04-13'),
      label: 'Apr 7 - Apr 13, 2025',
      month: 'April 2025',
      rows: [
        makeRow({ duration: 12.6 }),
        makeRow({ duration: 3.0, name: 'Fernando' }),
      ],
    };

    const md = generateCsvWeekMarkdown(week);

    expect(md).toContain('15.6 actual hours');
  });

  it('includes all team members in summary', () => {
    const week: CsvWeekGroup = {
      weekStart: new Date('2025-04-07'),
      weekEnd: new Date('2025-04-13'),
      label: 'Apr 7 - Apr 13, 2025',
      month: 'April 2025',
      rows: [
        makeRow({ name: 'Emman', duration: 7.0 }),
        makeRow({ name: 'Fernando', duration: 2.0 }),
        makeRow({ name: 'Isabela', duration: 3.0 }),
      ],
    };

    const md = generateCsvWeekMarkdown(week);

    expect(md).toContain('Emman');
    expect(md).toContain('Fernando');
    expect(md).toContain('Isabela');
  });

  it('truncates long task descriptions', () => {
    const longTask = 'A'.repeat(100);
    const week: CsvWeekGroup = {
      weekStart: new Date('2025-04-07'),
      weekEnd: new Date('2025-04-13'),
      label: 'Apr 7 - Apr 13, 2025',
      month: 'April 2025',
      rows: [makeRow({ task: longTask })],
    };

    const md = generateCsvWeekMarkdown(week);
    expect(md).toContain('...');
    expect(md).not.toContain(longTask);
  });
});
