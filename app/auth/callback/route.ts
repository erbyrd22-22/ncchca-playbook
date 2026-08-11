import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Magic-link / OAuth landing. Exchanges the code for a session.
 *
 * The app_user row is created by the on_auth_user_created trigger in the
 * database (SECURITY DEFINER, always role 'viewer'), so nothing is written
 * here — which also means this route never needs elevated database access.
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(new URL(next, url.origin));
}
