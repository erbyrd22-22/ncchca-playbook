'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Instance } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

export default function TopBar({
  instances, current, user, section, editing, onToggleEdit,
}: {
  instances: Instance[]; current: Instance; user: SessionUser | null;
  section: string; editing: boolean; onToggleEdit: () => void;
}) {
  const router = useRouter();
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
          {user && <span className={`role ${user.role}`} title={user.email}>{user.role}</span>}
          {user && (
            <form action="/auth/signout" method="post" style={{ display: 'inline' }}>
              <button className="btn" type="submit">Sign out</button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
