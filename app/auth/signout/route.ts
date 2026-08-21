import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase-server';

/**
 * Sign out and land on the login page.
 *
 * The session cookies are cleared explicitly on the redirect response as well
 * as through supabase.auth.signOut(). Without that belt-and-braces step a
 * stale cookie can survive the redirect, middleware still sees a signed-in
 * user on /login, and it bounces straight back into the playbook — which
 * reads as "sign out does nothing".
 */
async function signOut(request: Request) {
  const sb = await serverClient();
  await sb.auth.signOut();

  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL('/login?signedout=1', url.origin), { status: 303 });

  for (const c of request.headers.get('cookie')?.split(';') ?? []) {
    const name = c.split('=')[0]?.trim();
    if (name && (name.startsWith('sb-') || name.includes('supabase'))) {
      res.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
  }
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}

export async function POST(request: Request) {
  return signOut(request);
}
export async function GET(request: Request) {
  return signOut(request);
}
