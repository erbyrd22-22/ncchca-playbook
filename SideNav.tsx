import type { Section } from '@/lib/db';
export const OUTPUTS = [
 { key: 'timeline', badge: '◷', title: 'Timeline' },
 { key: 'budget', badge: '$', title: 'Budget' },
 { key: 'sponsors', badge: '◈', title: 'Sponsors' },
 { key: 'narrative', badge: '¶', title: 'HRSA Narrative' },
 { key: 'feed', badge: '↗', title: 'Exports' },
];
export default function SideNav({ instanceSlug, sections, progress, active }: {
 instanceSlug: string;
 sections: Section[];
 progress: Record<string, { total: number; done: number; pct: number | null }>;
 active: string;
}) {
 const groups: Record<string, Section[]> = {};
 for (const s of sections) (groups[s.nav_group] ??= []).push(s);
 return (
 <nav className="side">
 {Object.entries(groups).map(([g, list]) => (
 <div key={g}>
 <div className="ng">{g}</div>
 {list.map((s) => {
 const pr = progress[s.slug];
 return (
 <a key={s.id} href={`/i/${instanceSlug}/${s.slug}`} className={s.slug === active ? 'on' : ''}>
 <span className="num">{s.badge}</span>
 {s.title}
 {pr?.total ? (<span className={`np ${pr.pct === 100 ? 'done' : ''}`}>{pr.pct}%</span>) : null}
 </a>
 );
 })}
 </div>
 ))}
 <div>
 <div className="ng">Outputs</div>
 {OUTPUTS.map((o) => (
 <a key={o.key} href={`/i/${instanceSlug}/out/${o.key}`} className={active === `out:${o.key}` ? 'on' : ''}>
 <span className="num out">{o.badge}</span>
 {o.title}
 </a>
 ))}
 </div>
 </nav>
 );
}

