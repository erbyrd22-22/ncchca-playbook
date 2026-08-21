'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase-browser';
import PasswordInput from './PasswordInput';

type Mode = 'password' | 'forgot' | 'magic';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | 'link' | 'reset'>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const sb = browserClient();
    const origin = window.location.origin;

    try {
      if (mode === 'password') {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/account/password')}`,
        });
        if (error) throw error;
        setSent('reset');
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
            shouldCreateUser: false, // invitation only — no self-signup
          },
        });
        if (error) throw error;
        setSent('link');
      }
    } catch (e: any) {
      const m = e?.message ?? '';
      setErr(
        m.includes('Invalid login credentials')
          ? 'That email and password do not match an account. If you have never set a password, ask your administrator to reset it.'
          : m.includes('Signups not allowed')
          ? 'That email has not been invited to this playbook.'
          : m || 'Sign-in failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-ok">
        <b>Check your email.</b>
        <p style={{ margin: '.4rem 0 0' }}>
          {sent === 'reset'
            ? <>We sent a password reset link to <b>{email}</b>.</>
            : <>We sent a sign-in link to <b>{email}</b>. It expires in one hour.</>}
        </p>
        <button className="auth-link" onClick={() => { setSent(null); setMode('password'); }}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth-form">
      {err && <div className="auth-err">{err}</div>}

      {mode === 'forgot' && (
        <p style={{ fontSize: '.86rem', color: 'var(--muted)', margin: '0 0 .2rem' }}>
          Enter your email and we will send you a link to set a new password.
        </p>
      )}

      <label>
        <span>Email</span>
        <input
          className="inp" type="email" required autoFocus autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ncchca.org"
        />
      </label>

      {mode === 'password' && (
        <label>
          <span>Password</span>
          <PasswordInput
            name="password" value={password} onChange={setPassword}
            autoComplete="current-password"
          />
        </label>
      )}

      <button className="auth-btn" disabled={busy}>
        {busy
          ? 'Working…'
          : mode === 'password'
          ? 'Sign in'
          : mode === 'forgot'
          ? 'Send reset link'
          : 'Email me a sign-in link'}
      </button>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {mode !== 'password' && (
          <button type="button" className="auth-link" onClick={() => { setMode('password'); setErr(null); }}>
            Sign in with a password
          </button>
        )}
        {mode !== 'forgot' && (
          <button type="button" className="auth-link" onClick={() => { setMode('forgot'); setErr(null); }}>
            Forgot your password?
          </button>
        )}
        {mode !== 'magic' && (
          <button type="button" className="auth-link" onClick={() => { setMode('magic'); setErr(null); }}>
            Email me a link instead
          </button>
        )}
      </div>
    </form>
  );
}
