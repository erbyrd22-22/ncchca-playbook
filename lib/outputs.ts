import 'server-only';
import { serverClient } from './supabase-server';
export type Registry = {
 id: string; name: string; slug: string; tier: string; status: string;
 event_date: string | null; venue: string | null; notes: string | null;
 budget_target: number | null; attendance_target: number | null;
 registration_opens: string | null; registration_closes: string | null;
};
export type BudgetLine = {
 id: string; kind: 'revenue' | 'expense'; category: string; label: string;
 planned: number; actual: number | null; month: string | null;
 note: string | null; sort_order: number;
};
export type Benefit = { label: string; done: boolean };
export type Sponsor = {
 id: string; org: string; contact_name: string | null; contact_email: string | null;
 tier: string; amount: number; status: string; benefits: Benefit[];
 note: string | null; sort_order: number;
};
export type Metric = {
 id: string; key: string; label: string; value: number | null;
 unit: string | null; note: string | null; sort_order: number;
};
export type Task = {
 id: string; label: string; due: string; done: boolean; done_at: string | null;
 owner: string | null; section: string; sectionSlug: string; phase: string;
};
export type Bar = {
 key: string; section: string; sectionSlug: string; phase: string;
 start: string; end: string; total: number; done: number;
};
export const num = (v: unknown) => (v == null ? 0 : Number(v));
export async function getRegistry(slug: string): Promise<Registry | undefined> {
 const sb = await serverClient();
 const { data } = await sb.from('instance')
 .select('id,name,slug,tier,status,event_date,venue,notes,budget_target,attendance_target,registration_opens,registration_closes')
 .eq('slug', slug).maybeSingle();
 return (data as Registry) ?? undefined;
}
export async function getBudget(instanceId: string): Promise<BudgetLine[]> {
 const sb = await serverClient();
 const { data } = await sb.from('budget_line')
 .select('id,kind,category,label,planned,actual,month,note,sort_order')
 .eq('instance_id', instanceId).order('sort_order');
 return (data ?? []).map((r: any) => ({ ...r, planned: num(r.planned), actual: r.actual == null ? null : num(r.actual) })) as BudgetLine[];
}
export async function getSponsors(instanceId: string): Promise<Sponsor[]> {
 const sb = await serverClient();
 const { data } = await sb.from('sponsor')
 .select('id,org,contact_name,contact_email,tier,amount,status,benefits,note,sort_order')
 .eq('instance_id', instanceId).order('sort_order');
 return (data ?? []).map((r: any) => ({ ...r, amount: num(r.amount), benefits: Array.isArray(r.benefits) ? r.benefits : [] })) as Sponsor[];
}
export async function getMetrics(instanceId: string): Promise<Metric[]> {
 const sb = await serverClient();
 const { data } = await sb.from('event_metric')
 .select('id,key,label,value,unit,note,sort_order')
 .eq('instance_id', instanceId).order('sort_order');
 return (data ?? []).map((r: any) => ({ ...r, value: r.value == null ? null : Number(r.value) })) as Metric[];
}
export async function getSchedule(instanceId: string, templateId: string) {
 const sb = await serverClient();
 const [{ data: states }, { data: sections }, { data: users }] = await Promise.all([
 sb.from('item_state').select('item_id,due_date,done,done_at,owner_id').eq('instance_id', instanceId).not('due_date', 'is', null),
 sb.from('section').select('id,slug,title,sort_order').eq('template_id', templateId).order('sort_order'),
 sb.from('app_user').select('id,full_name'),
 ]);
 const stateBy = new Map((states ?? []).map((s: any) => [s.item_id, s]));
 if (!stateBy.size) return { tasks: [] as Task[], bars: [] as Bar[] };
 const sectionIds = (sections ?? []).map((s: any) => s.id);
 const { data: blocks } = await sb.from('block').select('id,section_id,title,sort_order').in('section_id', sectionIds).order('sort_order');
 const blockIds = (blocks ?? []).map((b: any) => b.id);
 const { data: items } = await sb.from('item').select('id,block_id,label,sort_order').in('block_id', blockIds).order('sort_order');
 const nameBy = new Map((users ?? []).map((u: any) => [u.id, u.full_name]));
 const blockBy = new Map((blocks ?? []).map((b: any) => [b.id, b]));
 const sectionBy = new Map((sections ?? []).map((s: any) => [s.id, s]));
 const tasks: Task[] = [];
 for (const it of items ?? []) {
 const st: any = stateBy.get(it.id);
 if (!st?.due_date) continue;
 const blk: any = blockBy.get(it.block_id);
 const sec: any = blk ? sectionBy.get(blk.section_id) : null;
 if (!sec) continue;
 tasks.push({
 id: it.id,
 label: String(it.label).replace(/<[^>]*>/g, ''),
 due: st.due_date,
 done: !!st.done,
 done_at: st.done_at ?? null,
 owner: st.owner_id ? nameBy.get(st.owner_id) ?? null : null,
 section: sec.title,
 sectionSlug: sec.slug,
 phase: blk?.title ?? 'General',
 });
 }
 tasks.sort((a, b) => a.due.localeCompare(b.due) || a.label.localeCompare(b.label));
 const byPhase = new Map<string, Task[]>();
 for (const t of tasks) {
 const k = `${t.sectionSlug} ${t.phase}`;
 const arr = byPhase.get(k) ?? [];
 arr.push(t);
 byPhase.set(k, arr);
 }
 const bars: Bar[] = [...byPhase.entries()].map(([k, ts]) => ({
 key: k,
 section: ts[0].section,
 sectionSlug: ts[0].sectionSlug,
 phase: ts[0].phase,
 start: ts.reduce((m, t) => (t.due < m ? t.due : m), ts[0].due),
 end: ts.reduce((m, t) => (t.due > m ? t.due : m), ts[0].due),
 total: ts.length,
 done: ts.filter((t) => t.done).length,
 })).sort((a, b) => a.start.localeCompare(b.start) || a.phase.localeCompare(b.phase));
 return { tasks, bars };
}
export function budgetTotals(lines: BudgetLine[]) {
 const sum = (k: 'revenue' | 'expense', f: (l: BudgetLine) => number) =>
 lines.filter((l) => l.kind === k).reduce((n, l) => n + f(l), 0);
 const revP = sum('revenue', (l) => l.planned);
 const expP = sum('expense', (l) => l.planned);
 const revA = sum('revenue', (l) => l.actual ?? 0);
 const expA = sum('expense', (l) => l.actual ?? 0);
 const booked = lines.some((l) => l.actual != null);
 return { revP, expP, netP: revP - expP, revA, expA, netA: revA - expA, booked };
}
export function budgetByMonth(lines: BudgetLine[]) {
 const m = new Map<string, { revenue: number; expense: number }>();
 for (const l of lines) {
 if (!l.month) continue;
 const key = l.month.slice(0, 7);
 const cur = m.get(key) ?? { revenue: 0, expense: 0 };
 cur[l.kind] += l.planned;
 m.set(key, cur);
 }
 return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v, net: v.revenue - v.expense }));
}
export function sponsorTotals(sponsors: Sponsor[]) {
 const live = sponsors.filter((s) => s.status !== 'declined');
 const val = (st: string[]) => sponsors.filter((s) => st.includes(s.status)).reduce((n, s) => n + s.amount, 0);
 const benefits = live.flatMap((s) => s.benefits);
 return {
 count: live.length,
 declined: sponsors.length - live.length,
 secured: val(['committed', 'paid']),
 paid: val(['paid']),
 pipeline: val(['prospect', 'invited']),
 benefitsTotal: benefits.length,
 benefitsDone: benefits.filter((b) => b.done).length,
 };
}
export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(iso: string) {
 const [y, m, d] = iso.slice(0, 10).split('-');
 return `${MON[Number(m) - 1]} ${Number(d)}, ${y}`;
}
export function fmtMonth(ym: string) {
 const [y, m] = ym.split('-');
 return `${MON[Number(m) - 1]} ${String(y).slice(2)}`;
}

