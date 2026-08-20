'use client';
import { useMemo, useState } from 'react';
import type { Registry, Metric } from '@/lib/outputs';
type Data = {
 budget: { revP: number; expP: number; netP: number; revA: number; expA: number; netA: number; booked: boolean };
 sponsors: { count: number; secured: number; paid: number; pipeline: number; benefitsTotal: number; benefitsDone: number };
 metrics: Metric[];
 tasksTotal: number;
 tasksDone: number;
};
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const longDate = (iso: string) => {
 const [y, m, d] = iso.slice(0, 10).split('-');
 return `${MON[Number(m) - 1]} ${Number(d)}, ${y}`;
};
const SEP = String.fromCharCode(10) + String.fromCharCode(10);
function build(reg: Registry, d: Data) {
 const get = (k: string) => d.metrics.find((m) => m.key === k)?.value ?? null;
 const attendance = get('attendance');
 const sessions = get('sessions');
 const ce = get('ce_hours');
 const ceClaimed = get('ce_claimed');
 const orgs = get('member_orgs');
 const score = get('eval_score');
 const resp = get('eval_response');
 const firstTime = get('first_time');
 const past = reg.event_date ? reg.event_date < new Date().toISOString().slice(0, 10) : false;
 const paras: string[] = [];
 paras.push(
 `${reg.name}${reg.event_date ? `${past ? ' was held on ' : ' is scheduled for '}${longDate(reg.event_date)}` : ' is scheduled'}` +
 `${reg.venue ? ` at ${reg.venue}` : ''}. The event is convened by the North Carolina Community ` +
 `Health Center Association as part of its training and technical assistance programme for ` +
 `federally qualified health centers and their partners across the state.`
 );
 if (attendance != null) {
 paras.push(
 `Total attendance was ${Math.round(attendance).toLocaleString()} participants` +
 `${reg.attendance_target ? ` against a target of ${reg.attendance_target.toLocaleString()}` : ''}` +
 `${orgs != null ? `, drawn from ${Math.round(orgs)} member health centers` : ''}` +
 `${firstTime != null ? `, of whom ${Math.round(firstTime)} were attending for the first time` : ''}.`
 );
 } else {
 paras.push(
 `[Attendance not yet recorded${reg.attendance_target ? `; the planning target is ${reg.attendance_target.toLocaleString()} participants` : ''}. ` +
 `Enter the final count on the event record before submitting.]`
 );
 }
 if (sessions != null || ce != null) {
 paras.push(
 `${sessions != null ? `The programme delivered ${Math.round(sessions)} sessions. ` : ''}` +
 `${ce != null ? `Continuing education was offered through Northwest AHEC, with ${ce} contact hours available` +
 `${ceClaimed != null ? ` and ${Math.round(ceClaimed)} attendees claiming credit` : ''}. ` : ''}`.trim()
 );
 }
 if (score != null || resp != null) {
 paras.push(
 `Participant evaluation was collected through the Tracking to Success instrument` +
 `${resp != null ? `, with a ${resp}% response rate` : ''}` +
 `${score != null ? `. Mean overall satisfaction was ${score} out of 5` : ''}.`
 );
 } else {
 paras.push(
 `[Evaluation results not yet available. Tracking to Success stays open for three weeks after ` +
 `the event; add the response rate and mean satisfaction score once it closes.]`
 );
 }
 const b = d.budget;
 const noBudget = !b.booked && b.revP === 0 && b.expP === 0;
 paras.push(
 b.booked
 ? `Financially, the event recorded ${money(b.revA)} in revenue against ${money(b.expA)} in ` +
 `expense, a net of ${money(b.netA)} (planned: ${money(b.netP)}).`
 : noBudget
 ? `[No budget figures on file. Enter planned revenue and expense on the Budget view before ` +
 `submitting — a reported net of zero is worse than an acknowledged gap.]`
 : `The approved budget projects ${money(b.revP)} in revenue against ${money(b.expP)} in expense, ` +
 `a planned net of ${money(b.netP)}. [Actuals not yet posted.]`
 );
 const s = d.sponsors;
 if (s.count) {
 paras.push(
 `Non-federal support totalled ${money(s.secured)} committed across ${s.count} sponsoring and ` +
 `partner organisations${s.paid ? `, of which ${money(s.paid)} has been received` : ''}` +
 `${s.pipeline ? `, with a further ${money(s.pipeline)} in the pipeline` : ''}. ` +
 `Of ${s.benefitsTotal} contracted sponsor benefits, ${s.benefitsDone} have been delivered.`
 );
 }
 paras.push(
 `Event delivery was managed against a documented operating playbook of ${d.tasksTotal} scheduled ` +
 `tasks with named owners and due dates; ${d.tasksDone} were complete at the time of this report. ` +
 `The playbook is maintained as a shared system of record so that the process survives staff ` +
 `turnover and can be applied consistently across the Association's event portfolio.`
 );
 if (!past) {
 paras.push(
 `[This event has not yet taken place. The narrative above reflects planned figures and should ` +
 `be regenerated after close-out.]`
 );
 }
 return paras.join(SEP);
}
function asMarkdown(reg: Registry, text: string, data: Data) {
 const NL = String.fromCharCode(10);
 const rows = data.metrics.map(
 (m) => `| ${m.label} | ${m.value == null ? 'not recorded' : `${m.value}${m.unit ? ` ${m.unit}` : ''}`} | ${m.note ?? ''} |`
 );
 return [
 `# ${reg.name}`,
 `Draft narrative for the Health Resources and Services Administration (HRSA).`,
 text,
 `## Outcome data on file`,
 `| Measure | Value | Note |`,
 `| --- | --- | --- |`,
 ...rows,
 ].join(NL + NL);
}

const slugify = (s: string) =>
 s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export default function Narrative({ reg, data }: { reg: Registry; data: Data }) {
 const text = useMemo(() => build(reg, data), [reg, data]);
 const [copied, setCopied] = useState(false);
 const gaps = data.metrics.filter((m) => m.value == null);

 const download = () => {
 const blob = new Blob([asMarkdown(reg, text, data)], { type: 'text/markdown;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `${slugify(reg.name)}-hrsa-narrative.md`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
 };
 return (
 <div className="report">
 {gaps.length > 0 && (
 <div className="note">
 <div className="h">{gaps.length} data point{gaps.length === 1 ? '' : 's'} still missing</div>
 <div>The draft below marks these in brackets rather than guessing: {gaps.map((g) => g.label).join(', ')}.</div>
 </div>
 )}
 <div className="card">
 <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
 <h2 style={{ flex: 1, margin: 0 }}>Draft narrative</h2>
 <button className="mini" onClick={() => {
 navigator.clipboard?.writeText(text).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 1600);
 });
 }}>{copied ? 'Copied' : 'Copy text'}</button>
 <button className="mini" onClick={download} title="Save the narrative and the outcome table as a Markdown file">Download</button>
 <button className="mini solid" onClick={() => window.print()} title="Print, or save as PDF from the print dialog">Print</button>
 </div>
 <div className="rule" />
 <div className="nar">
 {text.split(SEP).map((p, i) => (
 <p key={i} className={p.startsWith('[') ? 'gap' : ''}>{p}</p>
 ))}
 </div>
 </div>
 <div className="card">
 <h2>Outcome data on file</h2><div className="rule" />
 <div className="tw">
 <table>
 <thead><tr><th>Measure</th><th style={{ textAlign: 'right' }}>Value</th><th>Note</th></tr></thead>
 <tbody>
 {data.metrics.map((m) => (
 <tr key={m.id}>
 <td>{m.label}</td>
 <td style={{ textAlign: 'right', color: m.value == null ? 'var(--muted)' : undefined }}>
 {m.value == null ? 'not recorded' : `${m.value}${m.unit ? ` ${m.unit}` : ''}`}
 </td>
 <td style={{ color: 'var(--muted)' }}>{m.note ?? ''}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

