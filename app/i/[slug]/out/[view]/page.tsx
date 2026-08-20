import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import SideNav, { OUTPUTS } from '@/components/SideNav';
import TopBar from '@/components/TopBar';
import { getInstance, getInstances, getSections, getProgress } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getRegistry, getBudget, getSponsors, getMetrics, getSchedule, budgetTotals, budgetByMonth, sponsorTotals, money, fmtDate, fmtMonth } from '@/lib/outputs';
import Gantt from '@/components/Gantt';
import Narrative from '@/components/Narrative';
export const dynamic = 'force-dynamic';
const TITLES: Record<string, { title: string; eyebrow: string; lede: string }> = {
 timeline: { title: 'Timeline', eyebrow: 'Derived output', lede: 'Every dated task for this event, rolled up by phase. Nothing here is entered twice: the dates come from the checklist, so the schedule updates itself as the playbook is worked.' },
 budget: { title: 'Budget', eyebrow: 'Derived output', lede: 'Revenue and expense lines for this event, with a month-by-month view of when the money actually moves.' },
 sponsors: { title: 'Sponsors and Exhibitors', eyebrow: 'Derived output', lede: 'Who has committed, what they were promised, and which of those promises have been delivered.' },
 narrative: { title: 'HRSA Narrative', eyebrow: 'Derived output', lede: 'A draft grant report for the Health Resources and Services Administration (HRSA) — the federal agency that funds community health centers and NCCHCA’s own programs. Written from the registry, budget, sponsorship and outcome data on file: read it, correct it, then download, print, or paste it into the report.' },
 feed: { title: 'Exports', eyebrow: 'Derived output', lede: 'The same data in formats other systems can read: the website, a calendar, a spreadsheet.' },
};
export default async function OutputPage({ params }: { params: Promise<{ slug: string; view: string }> }) {
 const { slug, view } = await params;
 if (!OUTPUTS.some((o) => o.key === view)) notFound();
 const instance = await getInstance(slug);
 if (!instance) notFound();
 const [instances, sections, progress, user, reg] = await Promise.all([
 getInstances(), getSections(instance.template_id), getProgress(instance.id), getSessionUser(), getRegistry(slug),
 ]);
 const meta = TITLES[view];
 return (
 <>
 <TopBar instances={instances} current={instance} user={user} section={`out/${view}`} editing={false} />
 <div className="wrap">
 <SideNav instanceSlug={slug} sections={sections} progress={progress} active={`out:${view}`} />
 <main>
 <div className="eyebrow">{meta.eyebrow}</div>
 <h1 className="page">{meta.title}</h1>
 <p className="lede">{meta.lede}</p>
 {view === 'timeline' && <TimelineView instance={instance} />}
 {view === 'budget' && <BudgetView instanceId={instance.id} target={reg?.budget_target ?? null} />}
 {view === 'sponsors' && <SponsorsView instanceId={instance.id} />}
 {view === 'narrative' && <Narrative reg={reg!} data={await narrativeData(instance.id, instance.template_id)} />}
 {view === 'feed' && <FeedView slug={slug} />}
 </main>
 </div>
 </>
 );
}
async function TimelineView({ instance }: { instance: { id: string; template_id: string } }) {
 const { tasks, bars } = await getSchedule(instance.id, instance.template_id);
 if (!tasks.length) return <p className="empty">No due dates set for this event yet. Add them from the flag button on any checklist item and the schedule builds itself.</p>;
 const upcoming = tasks.filter((t) => !t.done).slice(0, 12);
 return (
 <>
 <Gantt bars={bars} />
 <div className="card">
 <h2>Next up</h2><div className="rule" />
 <div className="tw">
 <table>
 <thead><tr><th>Due</th><th>Task</th><th>Phase</th><th>Owner</th></tr></thead>
 <tbody>
 {upcoming.map((t) => (
 <tr key={t.id}>
 <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.due)}</td>
 <td>{t.label}</td>
 <td style={{ color: 'var(--muted)' }}>{t.phase}</td>
 <td>{t.owner ?? '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.6rem 0 0' }}>
 {tasks.filter((t) => !t.done).length} open, {tasks.filter((t) => t.done).length} complete, {tasks.length} dated tasks in total
 </p>
 </div>
 </>
 );
}
async function BudgetView({ instanceId, target }: { instanceId: string; target: number | null }) {
 const lines = await getBudget(instanceId);
 if (!lines.length) return <p className="empty">No budget lines for this event yet.</p>;
 const t = budgetTotals(lines);
 const months = budgetByMonth(lines);
 const scale = Math.max(...months.map((x) => Math.max(x.revenue, x.expense)), 1);
 const cats = (kind: 'revenue' | 'expense') => {
 const m = new Map<string, typeof lines>();
 for (const l of lines.filter((x) => x.kind === kind)) {
 const arr = m.get(l.category) ?? [];
 arr.push(l);
 m.set(l.category, arr);
 }
 return [...m.entries()];
 };
 return (
 <>
 <div className="stats">
 <div className="stat"><div className="n">{money(t.revP)}</div><div className="l">Planned revenue</div></div>
 <div className="stat"><div className="n">{money(t.expP)}</div><div className="l">Planned expense</div></div>
 <div className="stat"><div className="n" style={{ color: t.netP >= 0 ? 'var(--ok)' : 'var(--risk)' }}>{money(t.netP)}</div><div className="l">Planned net</div></div>
 <div className="stat"><div className="n">{target ? money(target) : '-'}</div><div className="l">Revenue target</div></div>
 </div>
 {(['revenue', 'expense'] as const).map((kind) => (
 <div className="card" key={kind}>
 <h2>{kind === 'revenue' ? 'Revenue' : 'Expense'}</h2><div className="rule" />
 <div className="tw">
 <table>
 <thead><tr><th>Line</th><th style={{ width: 120 }}>When</th><th style={{ width: 120, textAlign: 'right' }}>Planned</th><th style={{ width: 120, textAlign: 'right' }}>Actual</th></tr></thead>
 <tbody>
 {cats(kind).map(([cat, rows]) => (
 <Fragment key={cat}>
 <tr><td colSpan={4} className="catrow">{cat}</td></tr>
 {rows.map((l) => (
 <tr key={l.id}>
 <td>{l.label}{l.note && <div className="sub">{l.note}</div>}</td>
 <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{l.month ? fmtMonth(l.month.slice(0, 7)) : '-'}</td>
 <td style={{ textAlign: 'right' }}>{money(l.planned)}</td>
 <td style={{ textAlign: 'right', color: l.actual == null ? 'var(--muted)' : undefined }}>{l.actual == null ? '-' : money(l.actual)}</td>
 </tr>
 ))}
 </Fragment>
 ))}
 <tr className="totrow">
 <td colSpan={2}>Total {kind}</td>
 <td style={{ textAlign: 'right' }}>{money(kind === 'revenue' ? t.revP : t.expP)}</td>
 <td style={{ textAlign: 'right' }}>{t.booked ? money(kind === 'revenue' ? t.revA : t.expA) : '-'}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 ))}
 <div className="card">
 <h2>Budget calendar</h2><div className="rule" />
 <p style={{ fontSize: '.86rem', color: 'var(--muted)', marginTop: 0 }}>When each planned line lands. Useful for cash timing: the big food and AV commitments hit the month before the event, while most registration revenue arrives earlier.</p>
 <div className="tw">
 <table>
 <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Expense</th><th style={{ textAlign: 'right' }}>Net</th><th style={{ width: '38%' }}>Shape</th></tr></thead>
 <tbody>
 {months.map((m) => (
 <tr key={m.month}>
 <td style={{ whiteSpace: 'nowrap' }}>{fmtMonth(m.month)}</td>
 <td style={{ textAlign: 'right' }}>{m.revenue ? money(m.revenue) : '-'}</td>
 <td style={{ textAlign: 'right' }}>{m.expense ? money(m.expense) : '-'}</td>
 <td style={{ textAlign: 'right', color: m.net >= 0 ? 'var(--ok)' : 'var(--risk)' }}>{money(m.net)}</td>
 <td>
 <div className="mb"><i className="rev" style={{ width: `${(m.revenue / scale) * 100}%` }} /></div>
 <div className="mb"><i className="exp" style={{ width: `${(m.expense / scale) * 100}%` }} /></div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </>
 );
}
async function SponsorsView({ instanceId }: { instanceId: string }) {
 const sponsors = await getSponsors(instanceId);
 if (!sponsors.length) return <p className="empty">No sponsors recorded for this event yet.</p>;
 const t = sponsorTotals(sponsors);
 return (
 <>
 <div className="stats">
 <div className="stat"><div className="n">{money(t.secured)}</div><div className="l">Committed or paid</div></div>
 <div className="stat"><div className="n">{money(t.paid)}</div><div className="l">Cash received</div></div>
 <div className="stat"><div className="n">{money(t.pipeline)}</div><div className="l">Still in pipeline</div></div>
 <div className="stat"><div className="n">{t.benefitsDone}/{t.benefitsTotal}</div><div className="l">Promised benefits delivered</div></div>
 </div>
 <div className="card">
 <h2>Fulfilment</h2><div className="rule" />
 <div className="tw">
 <table>
 <thead><tr><th>Organisation</th><th>Tier</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th style={{ width: '34%' }}>Benefits</th></tr></thead>
 <tbody>
 {sponsors.map((s) => (
 <tr key={s.id} className={s.status === 'declined' ? 'muted' : ''}>
 <td>{s.org}{s.contact_name && <div className="sub">{s.contact_name}</div>}{s.note && <div className="sub">{s.note}</div>}</td>
 <td style={{ whiteSpace: 'nowrap' }}>{s.tier}</td>
 <td style={{ textAlign: 'right' }}>{s.amount ? money(s.amount) : '-'}</td>
 <td><span className={`st ${s.status}`}>{s.status}</span></td>
 <td>
 {s.benefits.length ? (
 <ul className="bl">
 {s.benefits.map((b, i) => (<li key={i} className={b.done ? 'y' : 'n'}>{b.done ? 'YES' : 'NO'} {b.label}</li>))}
 </ul>
 ) : <span style={{ color: 'var(--muted)' }}>-</span>}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </>
 );
}
function FeedView({ slug }: { slug: string }) {
 const rows: [string, string, string][] = [
 ['Event feed (JSON)', `/api/i/${slug}/data/feed`, 'Name, dates, venue, registration window, progress and supporters: what a website or app would consume.'],
 ['Schedule (iCal)', `/api/i/${slug}/data/schedule`, 'Every dated task as a calendar event. Subscribe in Outlook or Google Calendar.'],
 ['Budget (CSV)', `/api/i/${slug}/data/budget`, 'Every revenue and expense line, for Excel or the finance team.'],
 ['Sponsors (CSV)', `/api/i/${slug}/data/sponsors`, 'Sponsor list with tier, amount, status and benefit fulfilment.'],
 ];
 return (
 <div className="card">
 <h2>Machine-readable exports</h2><div className="rule" />
 <div className="grid">
 {rows.map(([label, href, desc]) => (
 <div className="tk" key={href} style={{ flexDirection: 'column', gap: '.3rem' }}>
 <a href={href} style={{ fontWeight: 600 }}>{label}</a>
 <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{desc}</span>
 <code style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{href}</code>
 </div>
 ))}
 </div>
 <p style={{ fontSize: '.83rem', color: 'var(--muted)' }}>These require a signed-in session. For a public website feed the JSON endpoint would need a read-only token, worth doing once someone wires it to ncchca.org.</p>
 </div>
 );
}
async function narrativeData(instanceId: string, templateId: string) {
 const [lines, sponsors, metrics, sched] = await Promise.all([
 getBudget(instanceId), getSponsors(instanceId), getMetrics(instanceId), getSchedule(instanceId, templateId),
 ]);
 return {
 budget: budgetTotals(lines),
 sponsors: sponsorTotals(sponsors),
 metrics,
 tasksTotal: sched.tasks.length,
 tasksDone: sched.tasks.filter((t) => t.done).length,
 };
}

