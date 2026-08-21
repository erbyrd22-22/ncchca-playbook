'use client';

import { useState } from 'react';
import { ItemRow, type Ctx } from './Blocks';
import type { Block } from '@/lib/db';

/**
 * The playbook as a guided path: one phase per step, in order, with this
 * event's own checkboxes, owners and due dates. Same data as the 12-Month
 * Timeline section — this is a way of walking it, not a second copy of it.
 */
export default function Walkthrough({
  steps, ctx, eventName,
}: {
  steps: Block[];
  ctx: Ctx;
  eventName: string;
}) {
  const firstUnfinished = Math.max(
    0,
    steps.findIndex((b) => b.items.some((i) => !i.done))
  );
  const [i, setI] = useState(firstUnfinished === -1 ? 0 : firstUnfinished);

  if (!steps.length) {
    return <p className="empty">This playbook has no timeline phases yet, so there is nothing to walk through.</p>;
  }

  const step = steps[i];
  const meta = step.meta ?? {};
  const done = step.items.filter((x) => x.done).length;
  const allDone = steps.reduce((n, b) => n + b.items.filter((x) => x.done).length, 0);
  const allTotal = steps.reduce((n, b) => n + b.items.length, 0);
  const pct = allTotal ? Math.round((allDone / allTotal) * 100) : 0;

  return (
    <>
      <div className="card" style={{ paddingBottom: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '.6rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, flex: 1 }}>{eventName}</h2>
          <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
            {allDone} of {allTotal} tasks complete · {pct}%
          </span>
        </div>
        <div style={{ height: 7, background: '#E4E8EC', borderRadius: 4, overflow: 'hidden', margin: '.7rem 0 1rem' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--teal),var(--blue))', borderRadius: 4 }} />
        </div>

        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
          {steps.map((b, n) => {
            const d = b.items.filter((x) => x.done).length;
            const complete = b.items.length > 0 && d === b.items.length;
            const current = n === i;
            return (
              <button
                key={b.id}
                onClick={() => setI(n)}
                title={b.title ?? `Step ${n + 1}`}
                style={{
                  width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'var(--fh)', fontWeight: 700, fontSize: '.75rem',
                  border: current ? '2px solid var(--teal)' : '1px solid var(--line)',
                  background: complete ? 'var(--teal)' : current ? '#fff' : '#F6F8FA',
                  color: complete ? '#fff' : current ? 'var(--navy)' : 'var(--muted)',
                }}
              >
                {n + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', flexWrap: 'wrap' }}>
          <span className="when">{(meta.when as string) ?? `Step ${i + 1}`}</span>
          <h2 style={{ margin: 0, flex: 1 }}>{step.title}</h2>
          <span style={{ fontSize: '.8rem', color: done === step.items.length && step.items.length ? 'var(--ok)' : 'var(--muted)' }}>
            {done}/{step.items.length}
          </span>
        </div>
        <div className="rule" />

        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: 0 }}>
          Step {i + 1} of {steps.length}. Tick items off as you go — this is the same record as the
          12-Month Timeline, so anything you change here shows up there and on the schedule.
        </p>

        {step.items.map((it) => <ItemRow key={it.id} item={it} ctx={ctx} />)}

        {meta.ai ? (
          <div className="ai" style={{ marginTop: '.9rem', marginBottom: 0 }}>
            <div className="h">◈ AI layer</div>
            <div>{meta.ai as string}</div>
          </div>
        ) : null}

        {meta.gate ? (
          <div className="gate"><b>Go / no-go gate</b>{meta.gate as string}</div>
        ) : null}

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="mini" disabled={i === 0} onClick={() => setI(i - 1)} style={{ padding: '.45rem .9rem' }}>
            ← Back
          </button>
          {i < steps.length - 1 ? (
            <button className="mini solid" onClick={() => setI(i + 1)} style={{ padding: '.45rem .9rem' }}>
              Next: {steps[i + 1].title} →
            </button>
          ) : (
            <a className="mini solid" href={`/i/${ctx.instSlug}/out/timeline`} style={{ padding: '.45rem .9rem', textDecoration: 'none' }}>
              Finish — see the schedule →
            </a>
          )}
          {done < step.items.length && (
            <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              {step.items.length - done} still open in this phase
            </span>
          )}
        </div>
      </div>
    </>
  );
}
