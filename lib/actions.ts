'use server';

import { revalidatePath } from 'next/cache';
import { serverClient } from './supabase-server';
import { logAudit } from './db';
import { requireEditor, requireAdmin, getSessionUser } from './auth';
import { cleanInline, cleanBlock, cleanText } from './sanitize';

const touch = (instSlug: string) => revalidatePath(`/i/${instSlug}`, 'layout');

/** Surface Postgres/RLS errors as readable messages instead of silent no-ops. */
function check(error: { message: string; code?: string } | null, what: string) {
  if (!error) return;
  if (error.code === '42501' || /row-level security/i.test(error.message))
    throw new Error(`Not authorized to ${what}.`);
  throw new Error(`Could not ${what}: ${error.message}`);
}

// ---------------------------------------------------------------------
// Progress (per instance)
// ---------------------------------------------------------------------
export async function toggleItem(instanceId: string, instSlug: string, itemId: string, done: boolean) {
  const u = await requireEditor();
  const sb = await serverClient();
  const { error } = await sb.from('item_state').upsert(
    {
 instance_id: instanceId, item_id: itemId, done,
 done_at: done ? new Date().toISOString() : null, // stamped on completion, cleared on un-check
 updated_by: u.id, updated_at: new Date().toISOString(),
 },
    { onConflict: 'instance_id,item_id' }
  );
  check(error, 'update this item');
  await logAudit(u.id, 'item.toggle', 'item', itemId, instanceId, null, { done });
  touch(instSlug);
}

export async function setItemMeta(
  instanceId: string, instSlug: string, itemId: string,
  patch: { owner_id?: string | null; due_date?: string | null; note?: string | null }
) {
  const u = await requireEditor();
  const sb = await serverClient();

  const row: Record<string, unknown> = {
    instance_id: instanceId, item_id: itemId,
    updated_by: u.id, updated_at: new Date().toISOString(),
  };
  if ('owner_id' in patch) row.owner_id = patch.owner_id || null;
  if ('due_date' in patch) row.due_date = patch.due_date || null;
  if ('note' in patch) row.note = cleanText(patch.note) || null;

  const { error } = await sb.from('item_state').upsert(row, { onConflict: 'instance_id,item_id' });
  check(error, 'save this item');
  await logAudit(u.id, 'item.meta', 'item', itemId, instanceId, null, patch);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Template content (affects every instance)
// ---------------------------------------------------------------------
export async function updateItemLabel(instSlug: string, itemId: string, label: string) {
  const u = await requireEditor();
  const sb = await serverClient();
  const clean = cleanInline(label);
  const { error } = await sb.from('item').update({ label: clean }).eq('id', itemId);
  check(error, 'edit this item');
  await logAudit(u.id, 'item.update', 'item', itemId, null, null, { label: clean });
  touch(instSlug);
}

export async function addItem(instSlug: string, blockId: string, label: string) {
  const u = await requireEditor();
  const clean = cleanInline(label);
  if (!clean) return;
  const sb = await serverClient();
  const { data: last } = await sb
    .from('item').select('sort_order').eq('block_id', blockId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await sb
    .from('item')
    .insert({ block_id: blockId, label: clean, sort_order: (last?.sort_order ?? -1) + 1 })
    .select('id').single();
  check(error, 'add this item');
  await logAudit(u.id, 'item.create', 'item', data?.id ?? null, null, null, { label: clean });
  touch(instSlug);
}

export async function deleteItem(instSlug: string, itemId: string) {
  const u = await requireEditor();
  const sb = await serverClient();
  const { data: before } = await sb.from('item').select('label,block_id').eq('id', itemId).maybeSingle();
  const { error } = await sb.from('item').delete().eq('id', itemId);
  check(error, 'delete this item');
  await logAudit(u.id, 'item.delete', 'item', itemId, null, before, null);
  touch(instSlug);
}

export async function moveItem(instSlug: string, itemId: string, dir: -1 | 1) {
  await requireEditor();
  const sb = await serverClient();
  const { data: me } = await sb.from('item').select('block_id,sort_order').eq('id', itemId).maybeSingle();
  if (!me) return;

  const q = sb.from('item').select('id,sort_order').eq('block_id', me.block_id);
  const { data: nbrs } = dir === -1
    ? await q.lt('sort_order', me.sort_order).order('sort_order', { ascending: false }).limit(1)
    : await q.gt('sort_order', me.sort_order).order('sort_order', { ascending: true }).limit(1);

  const nbr = nbrs?.[0];
  if (!nbr) return;

  // Two-step swap via a temporary slot avoids tripping the unique ordering
  // assumptions if they're ever tightened.
  await sb.from('item').update({ sort_order: -1 }).eq('id', itemId);
  await sb.from('item').update({ sort_order: me.sort_order }).eq('id', nbr.id);
  await sb.from('item').update({ sort_order: nbr.sort_order }).eq('id', itemId);
  touch(instSlug);
}

export async function updateBlock(
  instSlug: string, blockId: string,
  patch: { title?: string | null; body?: string | null }
) {
  const u = await requireEditor();
  const sb = await serverClient();
  const upd: Record<string, unknown> = {};
  if (patch.title !== undefined) upd.title = cleanText(patch.title);
  if (patch.body !== undefined) upd.body = cleanBlock(patch.body);
  if (!Object.keys(upd).length) return;
  const { error } = await sb.from('block').update(upd).eq('id', blockId);
  check(error, 'edit this block');
  await logAudit(u.id, 'block.update', 'block', blockId, null, null, patch);
  touch(instSlug);
}

export async function addBlock(instSlug: string, sectionId: string, kind: string) {
  const u = await requireEditor();
  const sb = await serverClient();
  const defaults: Record<string, { title: string; body: string }> = {
    card: { title: 'New section', body: 'Describe this component.' },
    ai:   { title: 'AI layer',    body: 'Where automation removes manual work in this phase.' },
    note: { title: 'Note',        body: 'Something to flag.' },
    quote:{ title: '',            body: 'A point worth pulling out.' },
    phase:{ title: 'New phase',   body: '' },
  };
  const d = defaults[kind] ?? defaults.card;
  const { data: last } = await sb
    .from('block').select('sort_order').eq('section_id', sectionId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await sb.from('block').insert({
    section_id: sectionId, kind, title: d.title, body: d.body,
    meta: kind === 'phase' ? { when: 'TBD' } : {},
    sort_order: (last?.sort_order ?? -1) + 1,
  }).select('id').single();
  check(error, 'add this block');
  await logAudit(u.id, 'block.create', 'block', data?.id ?? null, null, null, { kind });
  touch(instSlug);
}

export async function deleteBlock(instSlug: string, blockId: string) {
  const u = await requireEditor();
  const sb = await serverClient();
  const { data: before } = await sb.from('block').select('kind,title').eq('id', blockId).maybeSingle();
  const { error } = await sb.from('block').delete().eq('id', blockId);
  check(error, 'delete this block');
  await logAudit(u.id, 'block.delete', 'block', blockId, null, before, null);
  touch(instSlug);
}

export async function updateSection(
  instSlug: string, sectionId: string,
  patch: { title?: string; lede?: string | null; eyebrow?: string | null }
) {
  const u = await requireEditor();
  const sb = await serverClient();
  const upd: Record<string, unknown> = {};
  if (patch.title !== undefined) upd.title = cleanText(patch.title);
  if (patch.lede !== undefined) upd.lede = cleanText(patch.lede);
  if (patch.eyebrow !== undefined) upd.eyebrow = cleanText(patch.eyebrow);
  if (!Object.keys(upd).length) return;
  const { error } = await sb.from('section').update(upd).eq('id', sectionId);
  check(error, 'edit this section');
  await logAudit(u.id, 'section.update', 'section', sectionId, null, null, patch);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Instances (admin)
// ---------------------------------------------------------------------
export async function createInstance(form: FormData) {
  const u = await requireAdmin();
  const sb = await serverClient();
  const name = cleanText(String(form.get('name') ?? ''));
  if (!name) throw new Error('Name required');

  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) +
    '-' + Math.random().toString(36).slice(2, 6);

  const { data: tpl } = await sb.from('template').select('id').limit(1).single();
  const { data, error } = await sb.from('instance').insert({
    template_id: tpl!.id, name, slug,
    tier: String(form.get('tier') || 'tier1'),
    status: 'planning',
    event_date: String(form.get('event_date') || '') || null,
    venue: cleanText(String(form.get('venue') || '')) || null,
    created_by: u.id,
  }).select('id,slug').single();
  check(error, 'create this event');
  await logAudit(u.id, 'instance.create', 'instance', data!.id, data!.id, null, { name });
  revalidatePath('/', 'layout');
  return data!.slug as string;
}

export async function updateInstance(instSlug: string, instanceId: string, form: FormData) {
  const u = await requireEditor();
  const sb = await serverClient();
  const { error } = await sb.from('instance').update({
    name: cleanText(String(form.get('name') ?? '')),
    status: String(form.get('status') ?? 'planning'),
    event_date: String(form.get('event_date') || '') || null,
    venue: cleanText(String(form.get('venue') || '')) || null,
    notes: cleanText(String(form.get('notes') || '')) || null,
  }).eq('id', instanceId);
  check(error, 'save this event');
  await logAudit(u.id, 'instance.update', 'instance', instanceId, instanceId, null, null);
  touch(instSlug);
}

export async function resetInstanceProgress(instSlug: string, instanceId: string) {
  const u = await requireAdmin();
  const sb = await serverClient();
  const { error } = await sb.from('item_state').delete().eq('instance_id', instanceId);
  check(error, "reset this event's progress");
  await logAudit(u.id, 'instance.reset', 'instance', instanceId, instanceId, null, null);
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------
export async function addComment(instSlug: string, instanceId: string, itemId: string, body: string) {
  const u = await getSessionUser();
  if (!u) throw new Error('Sign in required');
  const clean = cleanText(body);
  if (!clean) return;
  const sb = await serverClient();
  const { error } = await sb.from('comment').insert({
    instance_id: instanceId, item_id: itemId, author_id: u.id, body: clean,
  });
  check(error, 'post this comment');
  touch(instSlug);
}

// ---------------------------------------------------------------------
// Deleting an event
// ---------------------------------------------------------------------

/**
 * Delete an event instance and everything scoped to it — progress, budget
 * lines, sponsors, metrics, comments (all ON DELETE CASCADE). Template
 * content is shared and is never touched. Requires the typed confirmation
 * so a stray click cannot destroy a year of tracking.
 */
export async function deleteInstance(instanceId: string, typed: string) {
  const u = await requireAdmin();
  const sb = await serverClient();

  const { data: inst } = await sb.from('instance').select('name,slug').eq('id', instanceId).single();
  if (!inst) throw new Error('That event no longer exists.');
  if (typed.trim() !== inst.name.trim())
    throw new Error('Type the event name exactly as shown to confirm the deletion.');

  const { count } = await sb.from('instance').select('id', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) throw new Error('This is the only event. Create another before deleting it.');

  await logAudit(u.id, 'instance.delete', 'instance', instanceId, null, inst, null);
  const { error } = await sb.from('instance').delete().eq('id', instanceId);
  check(error, 'delete this event');

  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------
// People and roles
// ---------------------------------------------------------------------

const ROLES = ['admin', 'editor', 'viewer'] as const;

/** Change an existing person's role. Admins cannot demote themselves. */
export async function setUserRole(userId: string, role: string) {
  const u = await requireAdmin();
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error('Unknown role.');
  if (userId === u.id) throw new Error('You cannot change your own role. Ask another admin.');

  const sb = await serverClient();
  const { error } = await sb.from('app_user').update({ role }).eq('id', userId);
  check(error, "change this person's role");
  await logAudit(u.id, 'user.role', 'app_user', userId, null, null, { role });
  revalidatePath('/', 'layout');
}

/**
 * Create a sign-in for someone with a temporary password they replace on
 * first use. Needs the Supabase service-role key, which is the only way to
 * mint an auth user with a known password; everything else in this app runs
 * on the anon key under Row Level Security.
 */
export async function createUser(form: FormData) {
  const u = await requireAdmin();
  const { adminClient } = await import('./supabase-admin');

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const fullName = cleanText(String(form.get('full_name') ?? '')).trim();
  const role = String(form.get('role') ?? 'viewer');
  const tempPassword = String(form.get('temp_password') ?? '');

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error('Unknown role.');
  if (tempPassword.length < 10) throw new Error('The temporary password needs at least 10 characters.');

  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // no confirmation mail — they sign in immediately
    user_metadata: { full_name: fullName || email.split('@')[0] },
  });
  if (error) {
    throw new Error(
      /already been registered/i.test(error.message)
        ? 'Someone with that email already has a sign-in. Change their role below instead.'
        : `Could not create the sign-in: ${error.message}`
    );
  }

  // the on_auth_user_created trigger has made the app_user row as a viewer
  const { error: upErr } = await admin
    .from('app_user')
    .update({ role, full_name: fullName || email.split('@')[0], must_change_password: true })
    .eq('id', data.user!.id);
  if (upErr) throw new Error(`Sign-in created, but the role did not save: ${upErr.message}`);

  await logAudit(u.id, 'user.create', 'app_user', data.user!.id, null, null, { email, role });
  revalidatePath('/', 'layout');
}

/** Remove someone's access entirely. */
export async function deleteUser(userId: string) {
  const u = await requireAdmin();
  if (userId === u.id) throw new Error('You cannot remove your own access.');
  const { adminClient } = await import('./supabase-admin');

  const admin = adminClient();
  const { data: row } = await admin.from('app_user').select('email').eq('id', userId).maybeSingle();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Could not remove that person: ${error.message}`);

  await logAudit(u.id, 'user.delete', 'app_user', userId, null, row ?? null, null);
  revalidatePath('/', 'layout');
}
