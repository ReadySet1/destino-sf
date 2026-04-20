#!/usr/bin/env node
// Rotate weekly backup folders in Supabase Storage.
// Keeps RETENTION_WEEKS most-recent week folders (YYYY-Www), deletes older ones.

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.BUCKET || 'db-backups';
const keep = parseInt(process.env.RETENTION_WEEKS || '8', 10);

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  'Content-Type': 'application/json',
};

async function listAt(prefix) {
  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prefix,
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });
  if (!res.ok) {
    throw new Error(`List ${prefix || '/'} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const top = await listAt('');
const weekFolders = [...new Set(top.map(e => e.name.split('/')[0]))]
  .filter(n => /^\d{4}-W\d{2}$/.test(n))
  .sort()
  .reverse();

const toDelete = weekFolders.slice(keep);
console.log(
  `Found ${weekFolders.length} week folders, keeping ${keep}, deleting ${toDelete.length}.`
);

for (const week of toDelete) {
  const entries = await listAt(week);
  const paths = entries.map(f => `${week}/${f.name}`);
  if (paths.length === 0) continue;

  const del = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!del.ok) {
    throw new Error(`Delete failed for ${week}: ${del.status} ${await del.text()}`);
  }
  console.log(`Deleted ${paths.length} files under ${week}/`);
}

console.log('Rotation complete.');
