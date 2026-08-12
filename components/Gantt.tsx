import type { Bar } from '@/lib/outputs';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function days(a: string, b: string) {
 const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
 return (d(b) - d(a)) / 86400000;
}
function addMonth(ym: string, n: number) {
 const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n;
 const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
 return `${yy}-${String(mm + 1).padStart(2, '0')}`;
}
export default function Gantt({ bars }: { bars: Bar[] }) {
 if (!bars.length) return null;
 const first = bars.reduce((m, b) => (b.start < m ? b.start : m), bars[0].start);
 const last = bars.reduce((m, b) => (b.end > m ? b.end : m), bars[0].end);
 const startMonth = first.slice(0, 7);
 const endMonth = last.slice(0, 7);
 const gridStart = `${startMonth}-01`;
 const months: string[] = [];
 for (let ym = startMonth; ; ym = addMonth(ym, 1)) {
 months.push(ym);
 if (ym === endMonth || months.length > 48) break;
 }
 const span = Math.max(days(gridStart, `${addMonth(endMonth, 1)}-01`), 1);
 const pct = (iso: string) => (days(gridStart, iso) / span) * 100;
 const groups: { section: string; rows: Bar[] }[] = [];
 for (const b of bars) {
 const g = groups.find((x) => x.section === b.section);
 if (g) g.rows.push(b); else groups.push({ section: b.section, rows: [b] });
 }
 return (
 <div className="card">
 <h2>Schedule</h2><div className="rule" />
 <div className="gwrap">
 <div className="gscroll">
 <div className="ghead" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
 {months.map((m) => (
 <div className="gm" key={m}>{MON[+m.slice(5, 7) - 1]}<span>{m.slice(2, 4)}</span></div>
 ))}
 </div>
 {groups.map((g) => (
 <div key={g.section}>
 <div className="gsec">{g.section}</div>
 {g.rows.map((b) => {
 const left = pct(b.start);
 const width = Math.max(pct(b.end) - left, 1.2);
 const complete = b.total > 0 ? Math.round((b.done / b.total) * 100) : 0;
 return (
 <div className="grow" key={b.key}>
 <div className="glab" title={b.phase}>{b.phase}</div>
 <div className="gtrack">
 {months.map((m, i) => (<span className="ggl" key={m} style={{ left: `${(i / months.length) * 100}%` }} />))}
 <div className={`gbar ${complete === 100 ? 'done' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${b.phase}: ${b.done}/${b.total} complete`}>
 <i style={{ width: `${complete}%` }} />
 <b>{b.done}/{b.total}</b>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.7rem 0 0' }}>
 Each bar runs from the first to the last due date in that phase; the solid fill is how much of it is checked off. Change a due date on the checklist and this moves with it.
 </p>
 </div>
 );
}

