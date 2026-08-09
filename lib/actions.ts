'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { sql, logAudit } from './db';
import { requireEditor, requireAdmin, getSessionUser } from './auth';
import { cleanInline, cleanBlock, cleanText } from './sanitize';

const touch = (instSlug: string) => revalidatePath(`/i/${instSlug}`, 'layout');

// ---------------------------------------------------------------------
// Progress (per instance)
// ---------------------------------------------------------------------
export async function toggleItem(instanceId: string, instSlug: string, itemId: string, done: boolean) {
  const u = await requireEditor();
  await sql`
    insert into item_state (instance_id, item_id, done, updated_by)
    values (${instanceId}, ${itemId}, ${done}, ${u.id})
    on conflict (instance_id, item_id)
    do update set done = excluded.done, updated_by = excluded.updated_by, updated_at = now()`;
  await logAudit(u.id, 'item.toggle', 'item', itemId, instanceId, null, { done });
  touch(instSlug);
}

export async function setItemMeta(
  instanceId: string, instSlug: string, itemId: string,
  patch: { owner_id?: string | null; due_date?: string | null; note?: string | null }
) {
  const u = await requireEditor();

  // Ensure the row exists, then apply only the keys actually supplied.
  await sql`
    insert into item_state (instance_id, item_id, updated_by)
    values (${instanceId}, ${itemId}, ${u.id})
    on conflict (instance_id, item_id) do nothing`;

  if ('owner_id' in patch)
    await sql`update item_state set owner_id = ${patch.owner_id ?? null}, updated_by = ${u.id}, updated_at = now()
              where instance_id = ${instanceId} and item_id = ${itemId}`;
  if ('due_date' in patch)
    await sql`update item_state set due_date = ${patch.due_date || null}, updated_by = ${u.id}, updated_at = now()
              where instance_id = ${instanceId} and item_id = ${itemId}`;
  if ('note' in patch)
    await sql`update item_state set note = ${cleanText(patch.note) || null}, updated_by = ${u.id}, updated_at = now()
              where instance_id = ${instanceId} and item_id = ${itemId}`;

  await logAudit(u.id, 'item.meta', 'item', itemId, instanceId, null, patch);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Template content editing (affects every instance)
// ---------------------------------------------------------------------
export async function updateItemLabel(instSlug: string, itemId: string, label: string) {
  const u = await requireEditor();
  const clean = cleanInline(label);
  const [before] = await sql`select label from item where id = ${itemId}`;
  await sql`update item set label = ${clean} where id = ${itemId}`;
  await logAudit(u.id, 'item.update', 'item', itemId, null, before, { label: clean });
  touch(instSlug);
}

export async function addItem(instSlug: string, blockId: string, label: string) {
  const u = await requireEditor();
  const clean = cleanInline(label);
  if (!clean) return;
  const [{ next }] = await sql<{ next: number }[]>`
    select coalesce(max(sort_order),-1)+1 as next from item where block_id = ${blockId}`;
  const [row] = await sql`insert into item (block_id, label, sort_order)
                          values (${blockId}, ${clean}, ${next}) returning id`;
  await logAudit(u.id, 'item.create', 'item', row.id, null, null, { label: clean });
  touch(instSlug);
}

export async function deleteItem(instSlug: string, itemId: string) {
  const u = await requireEditor();
  const [before] = await sql`select label, block_id from item where id = ${itemId}`;
  await sql`delete from item where id = ${itemId}`;
  await logAudit(u.id, 'item.delete', 'item', itemId, null, before, null);
  touch(instSlug);
}

export async function moveItem(instSlug: string, itemId: string, dir: -1 | 1) {
  await requireEditor();
  const [me] = await sql<{ block_id: string; sort_order: number }[]>`
    select block_id, sort_order from item where id = ${itemId}`;
  if (!me) return;
  const [neighbour] = await sql<{ id: string; sort_order: number }[]>`
    select id, sort_order from item
    where block_id = ${me.block_id}
      and sort_order ${dir === -1 ? sql`<` : sql`>`} ${me.sort_order}
    order by sort_order ${dir === -1 ? sql`desc` : sql`asc`} limit 1`;
  if (!neighbour) return;
  await sql.begin(async (t) => {
    await t`update item set sort_order = ${neighbour.sort_order} where id = ${itemId}`;
    await t`update item set sort_order = ${me.sort_order} where id = ${neighbour.id}`;
  });
  touch(instSlug);
}

export async function updateBlock(
  instSlug: string, blockId: string,
  patch: { title?: string | null; body?: string | null }
) {
  const u = await requireEditor();
  const [before] = await sql`select title, body from block where id = ${blockId}`;
  if (patch.title !== undefined)
    await sql`update block set title = ${cleanText(patch.title)} where id = ${blockId}`;
  if (patch.body !== undefined)
    await sql`update block set body = ${cleanBlock(patch.body)} where id = ${blockId}`;
  await logAudit(u.id, 'block.update', 'block', blockId, null, before, patch);
  touch(instSlug);
}

export async function addBlock(instSlug: string, sectionId: string, kind: string) {
  const u = await requireEditor();
  const [{ next }] = await sql<{ next: number }[]>`
    select coalesce(max(sort_order),-1)+1 as next from block where section_id = ${sectionId}`;
  const defaults: Record<string, { title: string; body: string }> = {
    card: { title: 'New section', body: 'Describe this component.' },
    ai:   { title: 'AI layer',    body: 'Where automation removes manual work in this phase.' },
    note: { title: 'Note',        body: 'Something to flag.' },
    quote:{ title: '',            body: 'A point worth pulling out.' },
    phase:{ title: 'New phase',   body: '' },
  };
  const d = defaults[kind] ?? defaults.card;
  const [row] = await sql`
    insert into block (section_id, kind, title, body, meta, sort_order)
    values (${sectionId}, ${kind}, ${d.title}, ${d.body},
            ${sql.json(kind === 'phase' ? { when: 'TBD' } : {})}, ${next})
    returning id`;
  await logAudit(u.id, 'block.create', 'block', row.id, null, null, { kind });
  touch(instSlug);
}

export async function deleteBlock(instSlug: string, blockId: string) {
  const u = await requireEditor();
  const [before] = await sql`select kind, title from block where id = ${blockId}`;
  await sql`delete from block where id = ${blockId}`;
  await logAudit(u.id, 'block.delete', 'block', blockId, null, before, null);
  touch(instSlug);
}

export async function updateSection(
  instSlug: string, sectionId: string,
  patch: { title?: string; lede?: string | null; eyebrow?: string | null }
) {
  const u = await requireEditor();
  const [before] = await sql`select title, lede, eyebrow from section where id = ${sectionId}`;
  if (patch.title !== undefined)
    await sql`update section set title = ${cleanText(patch.title)} where id = ${sectionId}`;
  if (patch.lede !== undefined)
    await sql`update section set lede = ${cleanText(patch.lede)} where id = ${sectionId}`;
  if (patch.eyebrow !== undefined)
    await sql`update section set eyebrow = ${cleanText(patch.eyebrow)} where id = ${sectionId}`;
  await logAudit(u.id, 'section.update', 'section', sectionId, null, before, patch);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Instances (admin)
// ---------------------------------------------------------------------
export async function createInstance(form: FormData) {
  const u = await requireAdmin();
  const name = cleanText(String(form.get('name') ?? ''));
  if (!name) throw new Error('Name required');
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) +
    '-' + Math.random().toString(36).slice(2, 6);
  const [tpl] = await sql`select id from template order by created_at limit 1`;
  const [row] = await sql`
    insert into instance (template_id, name, slug, tier, status, event_date, venue, created_by)
    values (${tpl.id}, ${name}, ${slug},
            ${String(form.get('tier') || 'tier1')}, 'planning',
            ${String(form.get('event_date') || '') || null},
            ${String(form.get('venue') || '') || null}, ${u.id})
    returning id, slug`;
  await logAudit(u.id, 'instance.create', 'instance', row.id, row.id, null, { name });
  revalidatePath('/', 'layout');
  return row.slug as string;
}

export async function updateInstance(instSlug: string, instanceId: string, form: FormData) {
  const u = await requireEditor();
  await sql`update instance set
    name = ${cleanText(String(form.get('name') ?? ''))},
    status = ${String(form.get('status') ?? 'planning')},
    event_date = ${String(form.get('event_date') || '') || null},
    venue = ${cleanText(String(form.get('venue') || '')) || null},
    notes = ${cleanText(String(form.get('notes') || '')) || null}
    where id = ${instanceId}`;
  await logAudit(u.id, 'instance.update', 'instance', instanceId, instanceId, null, null);
  touch(instSlug);
}

export async function resetInstanceProgress(instSlug: string, instanceId: string) {
  const u = await requireAdmin();
  await sql`delete from item_state where instance_id = ${instanceId}`;
  await logAudit(u.id, 'instance.reset', 'instance', instanceId, instanceId, null, null);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------
export async function addComment(instSlug: string, instanceId: string, itemId: string, body: string) {
  const u = await getSessionUser();
  if (!u) throw new Error('Sign in required');
  if (!body.trim()) return;
  await sql`insert into comment (instance_id, item_id, author_id, body)
            values (${instanceId}, ${itemId}, ${u.id}, ${cleanText(body)})`;
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Dev-only role switcher
// ---------------------------------------------------------------------
export async function devSwitchUser(email: string) {
  if (process.env.AUTH_MODE === 'supabase') throw new Error('Disabled in production');
  (await cookies()).set('dev_user', email, { path: '/', httpOnly: true, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}
