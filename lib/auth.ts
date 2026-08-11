import 'server-only';
import { serverClient } from './supabase-server';

export type Role = 'admin' | 'editor' | 'viewer';
export type SessionUser = { id: string; email: string; full_name: string; role: Role };

/**
 * Identity comes from Supabase Auth. The role is read from app_user, whose
 * row is created automatically by the on_auth_user_created trigger and
 * always defaults to 'viewer'.
 *
 * getUser() revalidates the token against Supabase rather than trusting a
 * decoded cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await serverClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;

  const { data: row } = await sb
    .from('app_user')
    .select('id,email,full_name,role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!row) {
    // Signed in but no profile row yet (trigger lag). Treat as least-privileged.
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: data.user.email?.split('@')[0] ?? 'User',
      role: 'viewer',
    };
  }
  return row as SessionUser;
}

export function canEdit(u: SessionUser | null) {
  return u?.role === 'editor' || u?.role === 'admin';
}
export function isAdmin(u: SessionUser | null) {
  return u?.role === 'admin';
}

/**
 * App-layer guard. RLS enforces the same rules in the database, so this is
 * defence in depth and a source of clear error messages — not the only gate.
 */
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
