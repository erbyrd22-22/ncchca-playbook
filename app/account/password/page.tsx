import { redirect } from 'next/navigation';
import Brandmark from '@/components/Brandmark';
import PasswordForm from '@/components/PasswordForm';
import { getSessionUser } from '@/lib/auth';
import { getMustChangePassword } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AccountPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account/password');
  const mustChange = await getMustChangePassword(user.id);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <Brandmark height={64} tone="dark" />
          <div>
            <h1>Set your password</h1>
            <div className="bs" style={{ color: 'var(--muted)' }}>{user.email}</div>
          </div>
        </div>

        <PasswordForm mustChange={mustChange} />

        <p className="auth-foot">
          {mustChange
            ? 'Your administrator created this account with a temporary password.'
            : 'Changing this only affects how you sign in. Your role and permissions stay the same.'}
        </p>
      </div>
      <div className="auth-credit">Built by Leverage AI Strategies</div>
    </div>
  );
}
