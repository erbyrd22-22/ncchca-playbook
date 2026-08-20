'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from './TopBar';
import SideNav from './SideNav';
import { BlockView, PhaseView, AddBlockBar } from './Blocks';
import { updateSection } from '@/lib/actions';
import type { Block, Instance, Section } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

export default function Shell({
  instances, instance, sections, section, blocks, progress, user, users,
}: {
  instances: Instance[]; instance: Instance; sections: Section[];
  section: Section; blocks: Block[];
  progress: Record<string, { total: number; done: number; pct: number | null }>;
  user: SessionUser | null;
  users: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const canEdit = user?.role === 'editor' || user?.role === 'admin';

  const ctx = {
    instanceId: instance.id, instSlug: instance.slug, sectionId: section.id,
    canEdit, editing: editing && canEdit, users,
  };


  const p = progress[section.slug];

  return (
    <>
      <TopBar
        instances={instances} current={instance} user={user}
        section={section.slug} editing={editing}
        onToggleEdit={() => setEditing((e) => !e)}
      />

      <div className="wrap">
        <SideNav instanceSlug={instance.slug} sections={sections} progress={progress} active={section.slug} />

        <main className={editing ? 'edit-on' : ''}>
          {editing && (
            <div className="banner">
              <b>Editing the template.</b> Changes to section text, blocks, and checklist items apply
              to <b>every event instance</b>. Progress, owners, due dates and notes stay per-instance.
            </div>
          )}

          {section.eyebrow && <div className="eyebrow">{section.eyebrow}</div>}

          {ctx.editing ? (
            <h1
              className="page" contentEditable suppressContentEditableWarning
              onBlur={(e) => {
                const v = e.currentTarget.textContent?.trim() ?? '';
                if (v && v !== section.title)
                  start(() => { updateSection(instance.slug, section.id, { title: v }).then(() => router.refresh()); });
              }}
            >{section.title}</h1>
          ) : (
            <h1 className="page">{section.title}</h1>
          )}

          {section.lede && (
            ctx.editing ? (
              <p
                className="lede" contentEditable suppressContentEditableWarning
                onBlur={(e) => {
                  const v = e.currentTarget.textContent?.trim() ?? '';
                  if (v !== section.lede)
                    start(() => { updateSection(instance.slug, section.id, { lede: v }).then(() => router.refresh()); });
                }}
              >{section.lede}</p>
            ) : <p className="lede">{section.lede}</p>
          )}

          {p?.total ? (
            <div className="prog">
              <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
              <b>{p.done} of {p.total} · {p.pct}%</b>
            </div>
          ) : null}

          {section.kind === 'timeline' ? (
            <div className="tl">
              {blocks.map((b) =>
                b.kind === 'phase'
                  ? <PhaseView key={b.id} block={b} ctx={ctx} />
                  : <BlockView key={b.id} block={b} ctx={ctx} />
              )}
            </div>
          ) : (
            blocks.map((b) => <BlockView key={b.id} block={b} ctx={ctx} />)
          )}

          {!blocks.length && <p className="empty">This section is empty. Turn on Edit to add content.</p>}

          <AddBlockBar ctx={ctx} />
        </main>
      </div>
    </>
  );
}
