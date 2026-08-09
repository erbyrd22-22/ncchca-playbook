import { cookies } from 'next/headers';
import { sql, type Role } from './db';

export type SessionUser = { id: string; email: string; full_name: string; role: Role };

/**
 * Two auth modes.
 *
 *  AUTH_MODE=dev       — local prototype. A cookie names which seeded user you
 *                        are, so all three roles can be demoed without email.
 *  AUTH_MODE=supabase  — production. Identity comes from Supabase Auth; the
 *                        role is read from app_user, which is keyed to auth.uid().
 *                        RLS (db/002_rls.sql) enforces the same rules at the
 *                        database level, so the app layer is not the only gate.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (process.env.AUTH_MODE === 'supabase') return getSupabaseUser();

  const jar = await cookies();
  const email = jar.get('dev_user')?.value ?? 'editor@ncchca.org';
  const [u] = await sql<SessionUser[]>`
    select id, email, full_name, role from app_user where email = ${email}`;
  return u ?? null;
}

async function getSupabaseUser(): Promise<SessionUser | null> {
  const { createServerClient } = await import('@supabase/ssr');
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cs) => { try { cs.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {} },
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [u] = await sql<SessionUser[]>`
    select id, email, full_name, role from app_user where id = ${data.user.id}`;
  return u ?? null;
}

export function canEdit(u: SessionUser | null) {
  return u?.role === 'editor' || u?.role === 'admin';
}
export function isAdmin(u: SessionUser | null) {
  return u?.role === 'admin';
}

/** Throws if the caller may not write. Every server action calls this. */
export async function requireEditor(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!canEdit(u)) throw new Error('Not authorized: editor role required');
  return u!;
}
export async function requireAdmin(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!isAdmin(u)) throw new Error('Not authorized: admin role required');
  return u!;
}
