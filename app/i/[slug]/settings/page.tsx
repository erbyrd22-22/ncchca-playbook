import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { getInstance, getInstances, getUsers, getAudit, countTemplateItems } from '@/lib/db';
import { getSessionUser, isAdmin, canEdit } from '@/lib/auth';
import { createInstance, updateInstance, resetInstanceProgress, deleteInstance, setUserRole, createUser, deleteUser } from '@/lib/actions';
import { adminConfigured } from '@/lib/supabase-admin';
import Brandmark from '@/components/Brandmark';

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

  const totalItems = await countTemplateItems(instance.template_id);

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
  async function removeInstance(form: FormData) {
    'use server';
    await deleteInstance(instance!.id, String(form.get('confirm') ?? ''));
    redirect('/');
  }
  async function changeRole(form: FormData) {
    'use server';
    await setUserRole(String(form.get('user_id')), String(form.get('role')));
    redirect(`/i/${slug}/settings`);
  }
  async function addUser(form: FormData) {
    'use server';
    await createUser(form);
    redirect(`/i/${slug}/settings`);
  }
  async function removeUser(form: FormData) {
    'use server';
    await deleteUser(String(form.get('user_id')));
    redirect(`/i/${slug}/settings`);
  }

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="bm">
            <Brandmark height={34} />
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
                <thead><tr><th>Name</th><th>Email</th><th>Role</th>{admin && <th style={{ width: 90 }}></th>}</tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td><td>{u.email}</td>
                      <td>
                        {admin && u.id !== user?.id ? (
                          <form action={changeRole} style={{ display: 'flex', gap: '.35rem' }}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <select className="inp" name="role" defaultValue={u.role} style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}>
                              <option value="admin">admin</option>
                              <option value="editor">editor</option>
                              <option value="viewer">viewer</option>
                            </select>
                            <button className="mini">Save</button>
                          </form>
                        ) : (
                          <span className={`role ${u.role}`}>{u.role}{u.id === user?.id ? ' · you' : ''}</span>
                        )}
                      </td>
                      {admin && (
                        <td>
                          {u.id !== user?.id && (
                            <form action={removeUser}>
                              <input type="hidden" name="user_id" value={u.id} />
                              <button className="mini del">Remove</button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {admin && (
              adminConfigured() ? (
                <form action={addUser} style={{ marginTop: '1rem', display: 'grid', gap: '.55rem' }}>
                  <h3 style={{ margin: 0, fontSize: '.95rem' }}>Add someone</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '.55rem' }}>
                    <input className="inp" name="email" type="email" placeholder="name@ncchca.org" required />
                    <input className="inp" name="full_name" placeholder="Full name" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: '.55rem' }}>
                    <select className="inp" name="role" defaultValue="viewer">
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input className="inp" name="temp_password" placeholder="Temporary password (10+ characters)" minLength={10} required />
                    <button className="mini solid" style={{ padding: '.45rem .9rem' }}>+ Add user</button>
                  </div>
                  <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: 0 }}>
                    They sign in with this temporary password and are asked to set their own
                    straight away. Send it to them over something other than email if you can, and
                    do not reuse a password you use elsewhere.
                  </p>
                </form>
              ) : (
                <div className="note" style={{ marginTop: '1rem' }}>
                  <div className="h">⚑ Adding users is not configured yet</div>
                  Creating a sign-in needs Supabase&rsquo;s <b>service_role</b> key. In Supabase go to
                  Project Settings → API, copy the <code>service_role</code> secret, then in Railway
                  add it to this service as <code>SUPABASE_SERVICE_ROLE_KEY</code> and redeploy.
                  Roles below can still be changed without it.
                </div>
              )
            )}
            <p style={{ fontSize: '.83rem', color: 'var(--muted)' }}>
              <b>Admin</b> edits structure, creates and deletes events, and manages people;
              <b> editor</b> edits content and progress; <b>viewer</b> is read-only. Row Level
              Security enforces this in the database, not just the app — so a viewer cannot write
              even if they reach the API directly.
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

              <hr style={{ border: 0, borderTop: '1px solid #F0DFA8', margin: '1.1rem 0' }} />

              <form action={removeInstance}>
                <p style={{ fontSize: '.87rem', marginTop: 0 }}>
                  <b>Delete {instance.name}</b> and everything recorded against it — progress,
                  owners, due dates, notes, budget lines, sponsors, metrics and comments. The
                  playbook template and every other event are untouched. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    className="inp" name="confirm" required
                    placeholder={`Type “${instance.name}” to confirm`}
                    style={{ flex: 1, minWidth: 260 }}
                  />
                  <button className="mini del" style={{ padding: '.45rem .9rem' }}>Delete this event</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
