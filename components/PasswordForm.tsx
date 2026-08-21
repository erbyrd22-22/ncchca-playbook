'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase-browser';
import PasswordInput from './PasswordInput';

/**
 * Lets the signed-in user set their own password. The password is sent
 * straight from the browser to Supabase Auth — it never passes through this
 * application's server, and nobody else can read it.
 */
export default function PasswordForm({ mustChange }: { mustChange: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 10) return setErr('Use at least 10 characters.');
    if (pw !== confirm) return setErr('The two passwords do not match.');

    setBusy(true);
    try {
      const sb = browserClient();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;

      const { data } = await sb.auth.getUser();
      if (data.user) {
        await sb.from('app_user').update({ must_change_password: false }).eq('id', data.user.id);
      }
      setDone(true);
      setPw('');
      setConfirm('');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-ok">
        <b>Password updated.</b>
        <p style={{ margin: '.4rem 0 0' }}>Use it the next time you sign in.</p>
        <a className="auth-link" href="/">Back to the playbook</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth-form">
      {mustChange && (
        <div className="auth-err" style={{ background: '#FFFBEF', borderColor: '#F0DFA8', color: '#8A6D1F' }}>
          You are signed in with a temporary password. Set your own before carrying on.
        </div>
      )}
      {err && <div className="auth-err">{err}</div>}

      <label>
        <span>New password</span>
        <PasswordInput name="password" value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
      </label>
      <label>
        <span>Confirm new password</span>
        <PasswordInput name="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </label>
      <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: 0 }}>
        At least 10 characters. A passphrase of three or four unrelated words is easier to
        remember and harder to guess than a short scramble.
      </p>

      <button className="auth-btn" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</button>
    </form>
  );
}
