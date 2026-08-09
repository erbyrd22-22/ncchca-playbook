import postgres from 'postgres';

declare global { var __sql: ReturnType<typeof postgres> | undefined; }

export const sql =
  global.__sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    onnotice: () => {},
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== 'production') global.__sql = sql;

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
export type Role = 'admin' | 'editor' | 'viewer';

export type Item = {
  id: string; block_id: string; label: string; detail: string | null;
  sort_order: number; done: boolean; owner_id: string | null;
  owner_name: string | null; due_date: string | null; note: string | null;
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
};

// ---------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------
export async function getInstances(): Promise<Instance[]> {
  return sql<Instance[]>`
    select id, name, slug, tier, status, event_date::text, venue, template_id
    from instance where status <> 'archived'
    order by case status when 'active' then 0 when 'planning' then 1 else 2 end,
             event_date nulls last, name`;
}

export async function getInstance(slug: string): Promise<Instance | undefined> {
  const [r] = await sql<Instance[]>`
    select id, name, slug, tier, status, event_date::text, venue, template_id
    from instance where slug = ${slug}`;
  return r;
}

export async function getSections(templateId: string): Promise<Section[]> {
  return sql<Section[]>`
    select id, slug, nav_group, badge, title, eyebrow, lede, kind, sort_order
    from section where template_id = ${templateId} order by sort_order`;
}

export async function getProgress(instanceId: string) {
  const rows = await sql<{ slug: string; total: number; done: number; pct: number | null }[]>`
    select slug, total::int, done::int, pct::int
    from v_section_progress where instance_id = ${instanceId}`;
  return Object.fromEntries(rows.map((r) => [r.slug, r]));
}

export async function getSectionContent(
  sectionId: string,
  instanceId: string
): Promise<Block[]> {
  const blocks = await sql<Omit<Block, 'items'>[]>`
    select id, section_id, kind, title, body, meta, sort_order
    from block where section_id = ${sectionId} order by sort_order`;
  if (!blocks.length) return [];

  const items = await sql<Item[]>`
    select it.id, it.block_id, it.label, it.detail, it.sort_order,
           coalesce(st.done,false) as done, st.owner_id,
           u.full_name as owner_name, st.due_date::text, st.note
    from item it
    left join item_state st on st.item_id = it.id and st.instance_id = ${instanceId}
    left join app_user u on u.id = st.owner_id
    where it.block_id in ${sql(blocks.map((b) => b.id))}
    order by it.sort_order`;

  return blocks.map((b) => ({ ...b, items: items.filter((i) => i.block_id === b.id) }));
}

export async function getUsers() {
  return sql<{ id: string; email: string; full_name: string; role: Role }[]>`
    select id, email, full_name, role from app_user order by role, full_name`;
}

export async function logAudit(
  actorId: string | null, action: string, entity: string,
  entityId: string | null, instanceId: string | null,
  before: unknown, after: unknown
) {
  await sql`insert into audit_log (actor_id, action, entity, entity_id, instance_id, before, after)
            values (${actorId}, ${action}, ${entity}, ${entityId}, ${instanceId},
                    ${sql.json(before as any)}, ${sql.json(after as any)})`;
}

export async function getAudit(instanceId: string, limit = 40) {
  return sql<{ action: string; entity: string; created_at: string; actor: string | null; after: any }[]>`
    select a.action, a.entity, a.created_at::text, u.full_name as actor, a.after
    from audit_log a left join app_user u on u.id = a.actor_id
    where a.instance_id = ${instanceId}
    order by a.created_at desc limit ${limit}`;
}
