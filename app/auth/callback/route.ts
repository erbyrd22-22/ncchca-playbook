import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';

/**
 * Magic-link / OAuth landing. Exchanges the code for a session, then makes
 * sure the signed-in user has an app_user row. A user who authenticates but
 * has no row gets 'viewer' — never an elevated role by accident.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const fail = (m: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(m)}`, url.origin));

  if (!code) return fail('Missing sign-in code. The link may have expired.');

  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => jar.set(name, value, options)),
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail(error?.message ?? 'Could not complete sign-in.');

  const u = data.user;
  await sql`
    insert into app_user (id, email, full_name, role)
    values (${u.id}, ${u.email ?? ''},
            ${u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'New user'}, 'viewer')
    on conflict (id) do update set last_seen_at = now()`;

  return NextResponse.redirect(new URL(next, url.origin));
}
