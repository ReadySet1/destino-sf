/**
 * Source-level guard: no application module may call `$disconnect()` on the
 * shared client exported by `@/lib/db` / `@/lib/db-unified`.
 *
 * That client is a process-wide singleton used concurrently by every request.
 * Disconnecting it from one code path wedged the Prisma engine for the whole
 * container on 2026-09-16 ("Engine is not yet connected" for 37 hours).
 * Anything that needs a fresh connection must go through
 * `forceResetConnection()` (or `shutdown()` at real process teardown), which
 * unpublish the client before touching it.
 *
 * The guard follows the binding, not a fixed name: alias imports
 * (`import { prisma as db }`), the legacy `db` / `unifiedPrisma` exports, and
 * relative imports (`from './db-unified'`) are all recognised.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_ROOT = join(process.cwd(), 'src');
const SKIPPED_DIRECTORIES = new Set(['__tests__', '__mocks__', 'scripts', 'node_modules']);
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs)$/;

// Every export of the shared client module that resolves to the singleton.
const SHARED_CLIENT_EXPORTS = new Set(['prisma', 'db', 'unifiedPrisma']);
const SHARED_CLIENT_IMPORT =
  /import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"](?:@\/lib|\.{1,2}(?:\/lib)?)\/(?:db|db-unified)['"]/g;

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry)) files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (SOURCE_FILE.test(entry)) files.push(fullPath);
  }
  return files;
}

/** Local binding names under which `source` imports the shared client. */
function sharedClientBindings(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(SHARED_CLIENT_IMPORT)) {
    for (const specifier of match[1].split(',')) {
      const [exported, alias] = specifier.trim().split(/\s+as\s+/);
      if (SHARED_CLIENT_EXPORTS.has(exported)) names.add(alias ?? exported);
    }
  }
  return [...names];
}

function disconnectsSharedClient(source: string): boolean {
  return sharedClientBindings(source).some(name =>
    new RegExp(`\\b${name}\\.\\$disconnect\\(`).test(source)
  );
}

describe('shared Prisma client ownership', () => {
  describe('the guard predicate', () => {
    it('flags a direct import that disconnects the shared client', () => {
      const source = "import { prisma } from '@/lib/db-unified';\nawait prisma.$disconnect();";
      expect(disconnectsSharedClient(source)).toBe(true);
    });

    it('flags a relative import under an alias', () => {
      const source = "import { prisma as db } from './db';\nvoid db.$disconnect();";
      expect(disconnectsSharedClient(source)).toBe(true);
    });

    it('flags the legacy db export imported from a parent directory', () => {
      const source = "import { withRetry, db } from '../lib/db';\nawait db.$disconnect();";
      expect(disconnectsSharedClient(source)).toBe(true);
    });

    it('ignores a private client that happens to be named prisma', () => {
      const source =
        "import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();\nawait prisma.$disconnect();";
      expect(disconnectsSharedClient(source)).toBe(false);
    });

    it('ignores a module that imports the shared client but disconnects another one', () => {
      const source =
        "import { prisma } from '@/lib/db';\nconst testClient = new PrismaClient();\nawait testClient.$disconnect();";
      expect(disconnectsSharedClient(source)).toBe(false);
    });
  });

  it('no module disconnects the shared client directly', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .filter(file => disconnectsSharedClient(readFileSync(file, 'utf8')))
      .map(file => relative(process.cwd(), file))
      .sort();

    expect(offenders).toEqual([]);
  });
});
