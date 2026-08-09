import LoginForm from '@/components/LoginForm';
import { supabaseConfigured } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = '/', error } = await searchParams;
  const devMode = process.env.AUTH_MODE !== 'supabase';

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <div className="mark" style={{ width: 46, height: 46, fontSize: '.85rem' }}>NC</div>
          <div>
            <h1>Conference &amp; Event Playbook</h1>
            <div className="bs" style={{ color: 'var(--muted)' }}>
              NC Community Health Center Association
            </div>
          </div>
        </div>

        {error && <div className="auth-err">{decodeURIComponent(error)}</div>}

        {devMode ? (
          <>
            <p className="auth-note">
              This build is running in <b>development mode</b> — sign-in is bypassed and a role
              switcher appears in the header instead. Set <code>AUTH_MODE=supabase</code> to
              enable real authentication.
            </p>
            <a className="auth-btn" href={next}>Continue to the playbook →</a>
          </>
        ) : !supabaseConfigured() ? (
          <div className="auth-err">
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        ) : (
          <LoginForm next={next} />
        )}

        <p className="auth-foot">
          Access is by invitation. If you need an account, contact your playbook administrator.
        </p>
      </div>
      <div className="auth-credit">Built by Leverage AI Strategies</div>
    </div>
  );
}
