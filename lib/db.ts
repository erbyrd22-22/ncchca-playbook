import 'server-only';
import { serverClient } from './supabase-server';

/**
 * Data access via the Supabase API using the signed-in user's own session.
 *
 * There is deliberately no Postgres connection string here. Every query
 * carries the user's JWT, so Row Level Security decides what they can see
 * and change — the database is the enforcement point, not this file.
 */

export type Role = 'admin' | 'editor' | 'viewer';

export type Item = {
  id: string; block_id: string; label: string; detail: string | null;
  sort_order: number; done: boolean; owner_id: string | null;
  owner_name: string | null; due_date: string | null; note: string | null;
 done_at: string | null;
};

export type Block = {
  id: string; section_id: string; kind: string; title: string | null;
  body: string | null; meta: Record<string, any>; sort_order: number;
  items: Item[];
};

export type Section = {
  id: string; slug: string; nav_group: string; badge: string | null;
  title: string; eyebrow: string | null; lede: string | null;
  kind: string; sort_order: number;
};

export type Instance = {
  id: string; name: string; slug: string; tier: string; status: string;
  event_date: string | null; venue: string | null; template_id: string;
  notes?: string | null;
};

const STATUS_RANK: Record<string, number> = { active: 0, planning: 1, complete: 2, archived: 3 };

export async function getInstances(): Promise<Instance[]> {
  const sb = await serverClient();
  const { data, error } = await sb
    .from('instance')
    .select('id,name,slug,tier,status,event_date,venue,template_id')
    .neq('status', 'archived');
  if (error) throw error;
  return (data ?? []).sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      (a.event_date ?? '9999').localeCompare(b.event_date ?? '9999') ||
      a.name.localeCompare(b.name)
  ) as Instance[];
}

export async function getInstance(slug: string): Promise<Instance | undefined> {
  const sb = await serverClient();
  const { data } = await sb
    .from('instance')
    .select('id,name,slug,tier,status,event_date,venue,template_id,notes')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Instance) ?? undefined;
}

export async function getSections(templateId: string): Promise<Section[]> {
  const sb = await serverClient();
  const { data, error } = await sb
    .from('section')
    .select('id,slug,nav_group,badge,title,eyebrow,lede,kind,sort_order')
    .eq('template_id', templateId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Section[];
}

export async function getProgress(instanceId: string) {
  const sb = await serverClient();
  const { data } = await sb
    .from('v_section_progress')
    .select('slug,total,done,pct')
    .eq('instance_id', instanceId);
  return Object.fromEntries((data ?? []).map((r: any) => [r.slug, r]));
}

export async function getSectionContent(
  sectionId: string,
  instanceId: string
): Promise<Block[]> {
  const sb = await serverClient();

  const { data: blocks, error: bErr } = await sb
    .from('block')
    .select('id,section_id,kind,title,body,meta,sort_order')
    .eq('section_id', sectionId)
    .order('sort_order');
  if (bErr) throw bErr;
  if (!blocks?.length) return [];

  const blockIds = blocks.map((b) => b.id);

  const [{ data: items }, { data: states }, { data: users }] = await Promise.all([
    sb.from('item')
      .select('id,block_id,label,detail,sort_order')
      .in('block_id', blockIds)
      .order('sort_order'),
    sb.from('item_state')
      .select('item_id,done,done_at,owner_id,due_date,note')
      .eq('instance_id', instanceId),
    sb.from('app_user').select('id,full_name'),
  ]);

  // Merged in JS rather than a SQL join: item_state rows are created lazily,
  // so most items have no matching row and a left join through PostgREST
  // would be more fragile than it's worth.
  const stateBy = new Map((states ?? []).map((s: any) => [s.item_id, s]));
  const nameBy = new Map((users ?? []).map((u: any) => [u.id, u.full_name]));

  return blocks.map((b) => ({
    ...b,
    meta: (b.meta ?? {}) as Record<string, any>,
    items: (items ?? [])
      .filter((i: any) => i.block_id === b.id)
      .map((i: any) => {
        const st = stateBy.get(i.id);
        return {
          ...i,
          done: st?.done ?? false,
 done_at: st?.done_at ?? null,
          owner_id: st?.owner_id ?? null,
          owner_name: st?.owner_id ? nameBy.get(st.owner_id) ?? null : null,
          due_date: st?.due_date ?? null,
          note: st?.note ?? null,
        } as Item;
      }),
  })) as Block[];
}

export async function getUsers() {
  const sb = await serverClient();
  const { data } = await sb
    .from('app_user')
    .select('id,email,full_name,role')
    .order('role')
    .order('full_name');
  return (data ?? []) as { id: string; email: string; full_name: string; role: Role }[];
}

export async function countTemplateItems(templateId: string): Promise<number> {
  const sb = await serverClient();
  const { data: secs } = await sb.from('section').select('id').eq('template_id', templateId);
  if (!secs?.length) return 0;
  const { data: blks } = await sb.from('block').select('id').in('section_id', secs.map((s) => s.id));
  if (!blks?.length) return 0;
  const { count } = await sb
    .from('item')
    .select('id', { count: 'exact', head: true })
    .in('block_id', blks.map((b) => b.id));
  return count ?? 0;
}

export async function logAudit(
  actorId: string | null, action: string, entity: string,
  entityId: string | null, instanceId: string | null,
  before: unknown, after: unknown
) {
  const sb = await serverClient();
  // Best-effort: a failed audit write must never block the user's action.
  await sb.from('audit_log').insert({
    actor_id: actorId, action, entity, entity_id: entityId,
    instance_id: instanceId, before: before as any, after: after as any,
  });
}

export async function getAudit(instanceId: string, limit = 40) {
  const sb = await serverClient();
  const { data } = await sb
    .from('audit_log')
    .select('action,entity,created_at,after,actor_id')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!data?.length) return [];
  const { data: users } = await sb.from('app_user').select('id,full_name');
  const nameBy = new Map((users ?? []).map((u: any) => [u.id, u.full_name]));
  return data.map((a: any) => ({
    action: a.action, entity: a.entity, created_at: a.created_at,
    actor: a.actor_id ? nameBy.get(a.actor_id) ?? null : null, after: a.after,
  }));
}
