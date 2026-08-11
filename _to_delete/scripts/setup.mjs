#!/usr/bin/env node
/**
 * One-command production setup.
 *
 *   DATABASE_URL="<supabase session-mode connection string>" \
 *   ADMIN_EMAIL="you@yourdomain.com" \
 *   npm run setup
 *
 * Applies the schema, seeds the playbook content, removes the local demo
 * users, and promotes ADMIN_EMAIL to admin if that person already exists
 * in Supabase Auth.
 */
import { execSync } from 'node:child_process';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const admin = process.env.ADMIN_EMAIL;
if (!url) { console.error('DATABASE_URL is required'); process.exit(1); }

const run = (c) => execSync(c, { stdio: 'inherit', env: process.env });

console.log('\n1/4  Applying schema and policies');
run('node scripts/migrate.mjs');

console.log('\n2/4  Seeding playbook content');
run('npx tsx db/seed.ts');

const sql = postgres(url, { onnotice: () => {}, max: 1 });

console.log('\n3/4  Removing local demo users');
const removed = await sql`
  delete from app_user
   where email in ('admin@ncchca.org','editor@ncchca.org','viewer@ncchca.org')
     and id not in (select id from auth.users)
  returning email`.catch(async () =>
  sql`delete from app_user where email in
      ('admin@ncchca.org','editor@ncchca.org','viewer@ncchca.org') returning email`);
console.log(`     removed ${removed.length}`);

console.log('\n4/4  Promoting first admin');
if (!admin) {
  console.log('     ADMIN_EMAIL not set — promote manually:');
  console.log("     update app_user set role='admin' where email='you@domain.com';");
} else {
  const r = await sql`update app_user set role='admin' where email=${admin} returning email`;
  console.log(r.length
    ? `     ${admin} is now admin`
    : `     ${admin} not found — invite them in Supabase Auth first, then re-run`);
}

await sql.end();
console.log('\nDone. Set AUTH_MODE=supabase on Railway and deploy.\n');
