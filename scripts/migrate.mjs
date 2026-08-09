#!/usr/bin/env node
/**
 * Applies db/*.sql in order against DATABASE_URL.
 * Safe to re-run: every statement is create-or-replace / if-not-exists,
 * except 001 which will error loudly if the schema already exists.
 */
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db');
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }

const only = process.argv[2];
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  .filter(f => !only || f.startsWith(only));

const sql = postgres(url, { onnotice: () => {}, max: 1 });
for (const f of files) {
  process.stdout.write(`→ ${f} … `);
  try {
    await sql.unsafe(readFileSync(join(dir, f), 'utf8'));
    console.log('ok');
  } catch (e) {
    console.log('FAILED');
    console.error('  ' + e.message);
    if (f.startsWith('001')) { await sql.end(); process.exit(1); }
  }
}
await sql.end();
console.log('Migrations complete.');
