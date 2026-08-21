import type { Instance } from '@/lib/db';

/**
 * The live list of events on the Event Portfolio page. Clicking one opens its
 * guided walkthrough; the picker in the top bar switches between them too.
 */
export default function EventList({
  instances, current, progress,
}: {
  instances: Instance[];
  current: string;
  progress: Record<string, { done: number; total: number; pct: number }>;
}) {
  return (
    <div className="card">
      <h2>Events running this playbook</h2><div className="rule" />
      <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginTop: 0 }}>
        Pick one to walk through building it, phase by phase. You can also switch events from the
        picker at the top of the page.
      </p>

      <div style={{ display: 'grid', gap: '.6rem' }}>
        {instances.map((i) => {
          const p = progress[i.id] ?? { done: 0, total: 0, pct: 0 };
          const isCurrent = i.slug === current;
          return (
            <a
              key={i.id}
              href={`/i/${i.slug}/walkthrough`}
              style={{
                display: 'block', textDecoration: 'none', color: 'inherit',
                border: isCurrent ? '1px solid var(--teal)' : '1px solid var(--line)',
                borderLeft: `4px solid ${isCurrent ? 'var(--teal)' : 'var(--blue)'}`,
                borderRadius: 'var(--r)', padding: '.85rem 1rem', background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fh)', fontWeight: 700, color: 'var(--navy)', flex: 1 }}>
                  {i.name}
                </span>
                <span className="pill" style={{ fontSize: '.66rem' }}>{i.status}</span>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                  {i.event_date ?? 'no date set'}
                </span>
              </div>
              {i.venue && (
                <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.15rem' }}>{i.venue}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '.55rem' }}>
                <div style={{ flex: 1, height: 6, background: '#E4E8EC', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: 'linear-gradient(90deg,var(--teal),var(--blue))' }} />
                </div>
                <span style={{ fontFamily: 'var(--fh)', fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)' }}>
                  {p.done}/{p.total || '—'}
                </span>
                <span style={{ fontFamily: 'var(--fh)', fontSize: '.72rem', fontWeight: 700, color: 'var(--teal-dk)' }}>
                  Start →
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
