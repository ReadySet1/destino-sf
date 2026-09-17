/**
 * Source-level guard: no application module may call `prisma.$disconnect()`
 * on the shared client exported by `@/lib/db` / `@/lib/db-unified`.
 *
 * That client is a process-wide singleton used concurrently by every request.
 * Disconnecting it from one code path wedged the Prisma engine for the whole
 * container on 2026-09-16 ("Engine is not yet connected" for 37 hours).
 * Anything that needs a fresh connection must go through
 * `forceResetConnection()` (or `shutdown()` at real process teardown), which
 * unpublish the client before touching it.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_ROOT = join(process.cwd(), 'src');
const SKIPPED_DIRECTORIES = new Set(['__tests__', '__mocks__', 'scripts', 'node_modules']);
const SOURCE_FILE = /\.(ts|tsx)$/;
const IMPORTS_SHARED_CLIENT = /from\s+['"]@\/lib\/(db|db-unified)['"]/;
const DISCONNECTS_SHARED_CLIENT = /\bprisma\.\$disconnect\(/;

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

describe('shared Prisma client ownership', () => {
  it('no module disconnects the shared client directly', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .filter(file => {
        const source = readFileSync(file, 'utf8');
        return IMPORTS_SHARED_CLIENT.test(source) && DISCONNECTS_SHARED_CLIENT.test(source);
      })
      .map(file => relative(process.cwd(), file))
      .sort();

    expect(offenders).toEqual([]);
  });
});
