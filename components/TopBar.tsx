'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { devSwitchUser } from '@/lib/actions';
import type { Instance } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

export default function TopBar({
  instances, current, user, section, editing, onToggleEdit, devMode,
}: {
  instances: Instance[]; current: Instance; user: SessionUser | null;
  section: string; editing: boolean; onToggleEdit: () => void; devMode: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [q, setQ] = useState('');
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  return (
    <header className="top">
      <div className="top-in">
        <div className="bm">
          <div className="mark">NC</div>
          <div style={{ minWidth: 0 }}>
            <div className="bt">Conference &amp; Event Playbook</div>
            <div className="bs">NC Community Health Center Association</div>
          </div>
        </div>

        <div className="tools">
          <select
            className="picker"
            value={current.slug}
            onChange={(e) => router.push(`/i/${e.target.value}/${section}`)}
            title="Switch event instance"
          >
            {instances.map((i) => (
              <option key={i.id} value={i.slug}>
                {i.status === 'active' ? '● ' : i.status === 'planning' ? '○ ' : ''}
                {i.name}
              </option>
            ))}
          </select>

          <input
            className="btn"
            style={{ width: 150, fontWeight: 400, fontFamily: 'var(--fb)' }}
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim())
                router.push(`/i/${current.slug}/search?q=${encodeURIComponent(q)}`);
            }}
          />

          {canEdit && (
            <button className={editing ? 'btn solid' : 'btn'} onClick={onToggleEdit}>
              {editing ? '✓ Done editing' : '✎ Edit'}
            </button>
          )}

          <a className="btn" href={`/i/${current.slug}/settings`}>Settings</a>

          {devMode && (
            <select
              className="picker"
              style={{ maxWidth: 130 }}
              value={user?.email ?? ''}
              onChange={(e) => start(() => { devSwitchUser(e.target.value).then(() => router.refresh()); })}
              title="Dev only — impersonate a role"
            >
              <option value="admin@ncchca.org">Admin</option>
              <option value="editor@ncchca.org">Editor</option>
              <option value="viewer@ncchca.org">Viewer</option>
            </select>
          )}
          {user && <span className={`role ${user.role}`} title={user.email}>{user.role}</span>}
          {!devMode && (
            <form action="/auth/signout" method="post" style={{ display: 'inline' }}>
              <button className="btn" type="submit">Sign out</button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
