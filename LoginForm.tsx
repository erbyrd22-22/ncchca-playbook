'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase-browser';

type Mode = 'magic' | 'password';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const sb = browserClient();

    try {
      if (mode === 'magic') {
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            shouldCreateUser: false, // invitation only — no self-signup
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (e: any) {
      setErr(
        e?.message?.includes('Signups not allowed')
          ? 'That email has not been invited to this playbook.'
          : e?.message ?? 'Sign-in failed.'
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
          We sent a sign-in link to <b>{email}</b>. It expires in one hour.
        </p>
        <button className="auth-link" onClick={() => { setSent(false); setEmail(''); }}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="auth-form">
      {err && <div className="auth-err">{err}</div>}

      <label>
        <span>Email</span>
        <input
          className="inp" type="email" required autoFocus autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ncchca.org"
        />
      </label>

      {mode === 'password' && (
        <label>
          <span>Password</span>
          <input
            className="inp" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      )}

      <button className="auth-btn" disabled={busy}>
        {busy ? 'Working…' : mode === 'magic' ? 'Email me a sign-in link' : 'Sign in'}
      </button>

      <button
        type="button" className="auth-link"
        onClick={() => { setMode(mode === 'magic' ? 'password' : 'magic'); setErr(null); }}
      >
        {mode === 'magic' ? 'Use a password instead' : 'Email me a link instead'}
      </button>
    </form>
  );
}
