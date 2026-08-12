'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Block, Item } from '@/lib/db';
import {
  toggleItem, setItemMeta, updateItemLabel, addItem, deleteItem, moveItem,
  updateBlock, addBlock, deleteBlock,
} from '@/lib/actions';

type Ctx = {
  instanceId: string; instSlug: string; sectionId: string;
  canEdit: boolean; editing: boolean;
  users: { id: string; full_name: string }[];
};

function Saving({ on }: { on: boolean }) {
  return <div className={`saving ${on ? 'on' : ''}`}>Saved</div>;
}

/* --------------------------------------------------------------- */
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** Format from the ISO string itself so server and client always agree. */
function fmtDay(iso: string) {
 const [y, m, d] = iso.slice(0, 10).split('-');
 return `${MON[Number(m) - 1]} ${Number(d)}, ${y}`;
}
function Editable({
  html, onSave, tag = 'div', className, placeholder,
}: {
  html: string; onSave: (v: string) => void; tag?: 'div' | 'h2' | 'p' | 'span';
  className?: string; placeholder?: string;
}) {
  const Tag = tag as any;
  return (
    <Tag
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      dangerouslySetInnerHTML={{ __html: html || '' }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerHTML.trim();
        if (v !== (html || '')) onSave(v);
      }}
    />
  );
}

/* --------------------------------------------------------------- */
function ItemRow({ item, ctx }: { item: Item; ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Optimistic: flip the box immediately, reconcile when the server answers.
  // `key` on the parent list means a server-confirmed change resets this.
  const [done, setDone] = useState(item.done);
  const pending = useRef(false);
  // Re-sync to the server value whenever it arrives and we aren't mid-flight,
  // so another user's change isn't masked by our local state.
  useEffect(() => { if (!pending.current) setDone(item.done); }, [item.done]);
  const shown = done;
 // Completion date, tracked alongside `done` so it appears the instant you tick.
 const [doneAt, setDoneAt] = useState(item.done_at);
 useEffect(() => { if (!pending.current) setDoneAt(item.done_at); }, [item.done_at]);

  const ping = () => { setSaved(true); setTimeout(() => setSaved(false), 1200); };
  const run = (fn: () => Promise<any>) =>
    start(() => { fn().then(() => { ping(); router.refresh(); }); });

  // Note box: opens automatically when an item is checked off, so whoever
  // ticked it can say what happened while it's fresh. Per event instance.
  const [noteBox, setNoteBox] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note ?? '');
  useEffect(() => { setNoteDraft(item.note ?? ''); }, [item.note]);
  const toggle = (next: boolean) => {
    setDone(next); setDoneAt(next ? new Date().toISOString() : null); // instant feedback
    pending.current = true;
    if (next && ctx.canEdit) setNoteBox(true); // prompt for a note on completion
    start(() => {
      toggleItem(ctx.instanceId, ctx.instSlug, item.id, next)
        .then(() => { ping(); router.refresh(); })
        .catch(() => { setDone(!next); setDoneAt(item.done_at); }) // roll back on failure
        .finally(() => { pending.current = false; });
    });
  };
  const saveNote = () => {
    run(() => setItemMeta(ctx.instanceId, ctx.instSlug, item.id, { note: noteDraft }));
    setNoteBox(false);
  };

  const overdue = item.due_date && !shown && new Date(item.due_date) < new Date();

  return (
    <>
      <Saving on={saved} />
      <div className={`row ${shown ? 'done' : ''}`}>
        <input
          type="checkbox"
          checked={shown}
          disabled={!ctx.canEdit}
          onChange={(e) => toggle(e.target.checked)}
        />
        {ctx.editing ? (
          <Editable
            className="lb"
            html={item.label}
            onSave={(v) => run(() => updateItemLabel(ctx.instSlug, item.id, v))}
          />
        ) : (
          <span className="lb" dangerouslySetInnerHTML={{ __html: item.label }} />
        )}

        <span className="rt">
          {ctx.canEdit && (
            <button className="mini" onClick={() => setOpen((o) => !o)} title="Owner, due date, note">
              ⚑
            </button>
          )}
          {ctx.editing && (
            <>
              <button className="mini" onClick={() => run(() => moveItem(ctx.instSlug, item.id, -1))} title="Move up">↑</button>
              <button className="mini" onClick={() => run(() => moveItem(ctx.instSlug, item.id, 1))} title="Move down">↓</button>
              <button className="mini del" onClick={() => { if (confirm('Delete this item from the template? It disappears from every event instance.')) run(() => deleteItem(ctx.instSlug, item.id)); }} title="Delete">✕</button>
            </>
          )}
        </span>
      </div>

      {noteBox && ctx.canEdit && (
        <div className="nb">
          <div className="nb-h">
            <span>Add a note</span>
            <button className="nb-x" onClick={() => setNoteBox(false)} title="Close">✕</button>
          </div>
          <textarea
            className="nb-t"
            autoFocus
            value={noteDraft}
            placeholder="What happened, who did it, anything the next person running this event should know..."
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
              if (e.key === 'Escape') setNoteBox(false);
            }}
          />
          <div className="nb-a">
            <button className="mini solid" onClick={saveNote}>Save note</button>
            <button className="mini" onClick={() => setNoteBox(false)}>Skip</button>
            <span className="nb-hint">Saved to this event only · ⌘↵ to save</span>
          </div>
        </div>
      )}

      {item.detail && (
        <details className="dt">
          <summary>Source detail</summary>
          <div>{item.detail}</div>
        </details>
      )}

      {(shown || item.owner_name || item.due_date || item.note) && !open && (
        <div className="meta-line">
          {shown && doneAt && <span className="chip ok">✓ completed {fmtDay(doneAt)}</span>}
 {item.owner_name && <span className="chip">{item.owner_name}</span>}
          {item.due_date && <span className={`chip ${overdue ? 'late' : 'due'}`}>due {item.due_date}</span>}
          {item.note && <span style={{ fontWeight: 400 }}>{item.note}</span>}
        </div>
      )}

      {open && (
        <div style={{ margin: '.3rem 0 .6rem 1.9rem', display: 'grid', gap: '.4rem', gridTemplateColumns: '1fr 1fr 2fr', alignItems: 'center' }}>
          <select
            className="inp"
            defaultValue={item.owner_id ?? ''}
            onChange={(e) => run(() => setItemMeta(ctx.instanceId, ctx.instSlug, item.id, { owner_id: e.target.value || null }))}
          >
            <option value="">— owner —</option>
            {ctx.users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <input
            className="inp" type="date" defaultValue={item.due_date ?? ''}
            onChange={(e) => run(() => setItemMeta(ctx.instanceId, ctx.instSlug, item.id, { due_date: e.target.value }))}
          />
          <input
            className="inp" placeholder="Note for this event…" defaultValue={item.note ?? ''}
            onBlur={(e) => run(() => setItemMeta(ctx.instanceId, ctx.instSlug, item.id, { note: e.target.value }))}
          />
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------- */
function AddItem({ blockId, ctx }: { blockId: string; ctx: Ctx }) {
  const router = useRouter();
  const [v, setV] = useState('');
  const [, start] = useTransition();
  if (!ctx.editing) return null;
  return (
    <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
      <input
        className="inp" placeholder="Add a checklist item…" value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && v.trim()) {
            const label = v.trim(); setV('');
            start(() => { addItem(ctx.instSlug, blockId, label).then(() => router.refresh()); });
          }
        }}
      />
      <button
        className="mini"
        onClick={() => {
          if (!v.trim()) return;
          const label = v.trim(); setV('');
          start(() => { addItem(ctx.instSlug, blockId, label).then(() => router.refresh()); });
        }}
      >+ Add</button>
    </div>
  );
}

/* --------------------------------------------------------------- */
function BlockTools({ blockId, ctx }: { blockId: string; ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  if (!ctx.editing) return null;
  return (
    <div className="blk-tools">
      <button
        className="mini del"
        onClick={() => { if (confirm('Delete this block and everything in it?')) start(() => { deleteBlock(ctx.instSlug, blockId).then(() => router.refresh()); }); }}
      >✕</button>
    </div>
  );
}

/* --------------------------------------------------------------- */
export function BlockView({ block, ctx }: { block: Block; ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  const save = (patch: { title?: string; body?: string }) =>
    start(() => { updateBlock(ctx.instSlug, block.id, patch).then(() => router.refresh()); });

  const meta = block.meta ?? {};

  if (block.kind === 'stats') {
    const stats = (meta.stats ?? []) as { n: string; l: string }[];
    return (
      <>
        {block.title && <h3 style={{ marginTop: '.4rem' }}>{block.title}</h3>}
        <div className="stats">
          {stats.map((s, i) => (
            <div className="stat" key={i}><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
          ))}
        </div>
      </>
    );
  }

  if (block.kind === 'pills') {
    return (
      <>
        {block.title && <h3>{block.title}</h3>}
        <div className="pills">
          {((meta.pills ?? []) as string[]).map((p, i) => <span className="pill" key={i}>{p}</span>)}
        </div>
      </>
    );
  }

  if (block.kind === 'table') {
    const cols = (meta.cols ?? []) as string[];
    const rows = (meta.rows ?? []) as string[][];
    return (
      <>
        {block.title && <h3>{block.title}</h3>}
        <div className="tw">
          <table>
            <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  if (block.kind === 'ai' || block.kind === 'note') {
    const cls = block.kind;
    return (
      <div className={cls}>
        <BlockTools blockId={block.id} ctx={ctx} />
        <div className="h">{block.kind === 'ai' ? '◈ ' : '⚑ '}{block.title ?? ''}</div>
        {ctx.editing
          ? <Editable html={block.body ?? ''} onSave={(v) => save({ body: v })} />
          : <div dangerouslySetInnerHTML={{ __html: block.body ?? '' }} />}
      </div>
    );
  }

  if (block.kind === 'quote') {
    return (
      <div className="quote">
        <BlockTools blockId={block.id} ctx={ctx} />
        {ctx.editing
          ? <Editable html={block.body ?? ''} onSave={(v) => save({ body: v })} />
          : <div dangerouslySetInnerHTML={{ __html: block.body ?? '' }} />}
      </div>
    );
  }

  // default: card
  const grid = (meta.grid ?? []) as [string, string][];
  return (
    <div className="card">
      <BlockTools blockId={block.id} ctx={ctx} />
      {block.title !== null && (
        ctx.editing
          ? <Editable tag="h2" html={block.title ?? ''} onSave={(v) => save({ title: v })} />
          : <h2>{block.title}</h2>
      )}
      <div className="rule" />
      {block.body && (
        ctx.editing
          ? <Editable html={block.body} onSave={(v) => save({ body: v })} />
          : <div dangerouslySetInnerHTML={{ __html: block.body }} />
      )}

      {grid.length > 0 && (
        <div className="grid">
          {grid.map(([k, n], i) => (
            <div className="tk" key={i}><span className="k">{k}</span><span>{n}</span></div>
          ))}
        </div>
      )}

      {block.items.length > 0 && (
        <div style={{ marginTop: block.body ? '.6rem' : 0 }}>
          {block.items.map((it) => <ItemRow key={it.id} item={it} ctx={ctx} />)}
        </div>
      )}
      <AddItem blockId={block.id} ctx={ctx} />
    </div>
  );
}

/* --------------------------------------------------------------- */
export function PhaseView({ block, ctx }: { block: Block; ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  const meta = block.meta ?? {};
  const done = block.items.filter((i) => i.done).length;
  const save = (patch: { title?: string; body?: string }) =>
    start(() => { updateBlock(ctx.instSlug, block.id, patch).then(() => router.refresh()); });

  return (
    <details className="ph">
      <summary>
        <span className="when">{(meta.when as string) ?? 'TBD'}</span>
        <span className="pt">{block.title}</span>
        {block.items.length > 0 && (
          <span className="pc" style={done === block.items.length ? { color: 'var(--ok)' } : {}}>
            {done}/{block.items.length}
          </span>
        )}
        <span style={{ color: 'var(--muted)' }}>▾</span>
      </summary>
      <div className="pb">
        {block.items.map((it) => <ItemRow key={it.id} item={it} ctx={ctx} />)}
        <AddItem blockId={block.id} ctx={ctx} />

        {meta.ai ? (
          <div className="ai" style={{ marginTop: '.8rem', marginBottom: 0 }}>
            <div className="h">◈ AI layer</div>
            <div>{meta.ai as string}</div>
          </div>
        ) : null}

        {meta.gate ? (
          <div className="gate"><b>Go / no-go gate</b>{meta.gate as string}</div>
        ) : null}

        {ctx.editing && (
          <div className="addbar">
            <button
              className="mini del"
              onClick={() => { if (confirm('Delete this phase?')) start(() => { deleteBlock(ctx.instSlug, block.id).then(() => router.refresh()); }); }}
            >Delete phase</button>
          </div>
        )}
      </div>
    </details>
  );
}

/* --------------------------------------------------------------- */
export function AddBlockBar({ ctx }: { ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  if (!ctx.editing) return null;
  const add = (kind: string) =>
    start(() => { addBlock(ctx.instSlug, ctx.sectionId, kind).then(() => router.refresh()); });
  return (
    <div className="addbar">
      <button className="mini" onClick={() => add('card')}>+ Card</button>
      <button className="mini" onClick={() => add('phase')}>+ Phase</button>
      <button className="mini" onClick={() => add('ai')}>+ AI layer</button>
      <button className="mini" onClick={() => add('note')}>+ Note</button>
      <button className="mini" onClick={() => add('quote')}>+ Pull quote</button>
    </div>
  );
}

