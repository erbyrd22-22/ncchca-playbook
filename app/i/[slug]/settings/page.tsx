import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { getInstance, getInstances, getUsers, getAudit, sql } from '@/lib/db';
import { getSessionUser, isAdmin, canEdit } from '@/lib/auth';
import { createInstance, updateInstance, resetInstanceProgress } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function Settings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instance = await getInstance(slug);
  if (!instance) notFound();

  const [user, users, audit, instances] = await Promise.all([
    getSessionUser(), getUsers(), getAudit(instance.id), getInstances(),
  ]);
  const admin = isAdmin(user);
  const editor = canEdit(user);

  const [{ count: totalItems }] = await sql<{ count: number }[]>`
    select count(*)::int from item it join block b on b.id=it.block_id
    join section s on s.id=b.section_id where s.template_id=${instance.template_id}`;

  async function saveInstance(form: FormData) {
    'use server';
    await updateInstance(slug, instance!.id, form);
    redirect(`/i/${slug}/settings`);
  }
  async function newInstance(form: FormData) {
    'use server';
    const s = await createInstance(form);
    redirect(`/i/${s}/overview`);
  }
  async function reset() {
    'use server';
    await resetInstanceProgress(slug, instance!.id);
    redirect(`/i/${slug}/settings`);
  }

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="bm">
            <div className="mark">NC</div>
            <div>
              <div className="bt">Settings</div>
              <div className="bs">{instance.name}</div>
            </div>
          </div>
          <div className="tools">
            <a className="btn solid" href={`/i/${slug}/overview`}>← Back to playbook</a>
            {user && <span className={`role ${user.role}`}>{user.role}</span>}
          </div>
        </div>
      </header>

      <div className="wrap">
        <main style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* ---- This instance ---- */}
          <div className="card">
            <h2>This event</h2><div className="rule" />
            {editor ? (
              <form action={saveInstance} style={{ display: 'grid', gap: '.7rem' }}>
                <label>
                  <div className="bs" style={{ color: 'var(--muted)' }}>Name</div>
                  <input className="inp" name="name" defaultValue={instance.name} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.7rem' }}>
                  <label>
                    <div className="bs" style={{ color: 'var(--muted)' }}>Status</div>
                    <select className="inp" name="status" defaultValue={instance.status}>
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label>
                    <div className="bs" style={{ color: 'var(--muted)' }}>Event date</div>
                    <input className="inp" type="date" name="event_date" defaultValue={instance.event_date ?? ''} />
                  </label>
                  <label>
                    <div className="bs" style={{ color: 'var(--muted)' }}>Tier</div>
                    <input className="inp" defaultValue={instance.tier} disabled />
                  </label>
                </div>
                <label>
                  <div className="bs" style={{ color: 'var(--muted)' }}>Venue / format</div>
                  <input className="inp" name="venue" defaultValue={instance.venue ?? ''} />
                </label>
                <div><button className="btn solid" style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}>Save</button></div>
              </form>
            ) : (
              <p className="empty">Viewers cannot change event settings.</p>
            )}
          </div>

          {/* ---- Instances ---- */}
          <div className="card">
            <h2>Event instances</h2><div className="rule" />
            <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginTop: 0 }}>
              Every instance runs the same {totalItems}-item template and tracks its own progress,
              owners, and dates. Editing template content changes it for all of them.
            </p>
            <div className="tw">
              <table>
                <thead><tr><th>Event</th><th>Tier</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {instances.map((i) => (
                    <tr key={i.id}>
                      <td><a href={`/i/${i.slug}/overview`}>{i.name}</a></td>
                      <td>{i.tier}</td><td>{i.status}</td><td>{i.event_date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {admin ? (
              <form action={newInstance} style={{ display: 'flex', gap: '.5rem', marginTop: '.9rem', flexWrap: 'wrap' }}>
                <input className="inp" name="name" placeholder="New event name…" style={{ flex: 2, minWidth: 200 }} required />
                <select className="inp" name="tier" style={{ flex: 1, minWidth: 120 }}>
                  <option value="tier1">Tier 1 — Conference</option>
                  <option value="tier2">Tier 2 — Series</option>
                  <option value="tier3">Tier 3 — Workgroup</option>
                </select>
                <input className="inp" type="date" name="event_date" style={{ flex: 1, minWidth: 140 }} />
                <button className="mini" style={{ padding: '.45rem .9rem' }}>+ Create instance</button>
              </form>
            ) : (
              <p className="empty">Only admins can create event instances.</p>
            )}
          </div>

          {/* ---- People ---- */}
          <div className="card">
            <h2>People &amp; roles</h2><div className="rule" />
            <div className="tw">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td><td>{u.email}</td>
                      <td><span className={`role ${u.role}`}>{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '.83rem', color: 'var(--muted)' }}>
              In production, users are invited by email through Supabase Auth and land here
              automatically. <b>Admin</b> edits structure and creates instances; <b>editor</b> edits
              content and progress; <b>viewer</b> is read-only. Row Level Security enforces this in
              the database, not just the app.
            </p>
          </div>

          {/* ---- Activity ---- */}
          <div className="card">
            <h2>Recent activity</h2><div className="rule" />
            {audit.length ? (
              <ul className="audit" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {audit.map((a, i) => (
                  <li key={i}>
                    <span className="a">{a.action}</span>
                    <span style={{ flex: 1 }}>{a.actor ?? 'system'}</span>
                    <span style={{ color: 'var(--muted)' }}>{a.created_at.slice(0, 16).replace('T', ' ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">Nothing recorded yet for this event.</p>}
          </div>

          {admin && (
            <div className="card" style={{ borderColor: '#F0DFA8', background: '#FFFBEF' }}>
              <h2>Danger zone</h2><div className="rule" />
              <form action={reset}>
                <p style={{ fontSize: '.87rem', marginTop: 0 }}>
                  Clear all checkboxes, owners, due dates, and notes for <b>{instance.name}</b>.
                  Template content is not affected.
                </p>
                <button className="mini del" style={{ padding: '.45rem .9rem' }}>Reset this event’s progress</button>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
