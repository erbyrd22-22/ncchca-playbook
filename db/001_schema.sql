-- =====================================================================
-- NCCHCA Conference & Event Playbook — schema
-- Postgres 16 / Supabase compatible
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- People & roles
-- In Supabase, app_user.id maps 1:1 to auth.users.id.
-- Locally we insert rows directly so the app can run without Supabase.
-- ---------------------------------------------------------------------
create type user_role as enum ('admin','editor','viewer');

create table app_user (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  full_name   text,
  role        user_role not null default 'viewer',
  invited_by  uuid references app_user(id),
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ---------------------------------------------------------------------
-- TEMPLATE LAYER
-- The canonical playbook. Editing here changes the master.
-- ---------------------------------------------------------------------
create table template (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  version     text not null default 'v0.1',
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A section is a nav entry: "Part 1 — Foundations", "Overview", etc.
create type section_kind as enum ('page','checklist','timeline','grid','table');

create table section (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references template(id) on delete cascade,
  slug        text not null,
  nav_group   text not null default 'The Playbook',   -- sidebar grouping
  badge       text,                                    -- "1".."7" or "◆"
  title       text not null,
  eyebrow     text,                                    -- "Part 1"
  lede        text,
  kind        section_kind not null default 'checklist',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (template_id, slug)
);

-- A block is a piece of content inside a section: a card, an AI callout,
-- a note, a quote, a table, or a timeline phase (which then holds items).
create type block_kind as enum ('card','ai','note','quote','table','phase','stats','pills');

create table block (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references section(id) on delete cascade,
  kind        block_kind not null default 'card',
  title       text,
  body        text,                 -- markdown-ish; rendered as paragraphs
  meta        jsonb not null default '{}'::jsonb,  -- phase timing, table rows, pills, stats
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A checklist item. Lives under a block (a card or a phase).
create table item (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid not null references block(id) on delete cascade,
  label       text not null,        -- may contain <b>…</b>
  detail      text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INSTANCE LAYER
-- An instance = one real event running the playbook.
-- e.g. "2027 Annual Primary Care Conference", "HCCN Excel Series — Fall".
-- Progress, notes, owners and dates attach to the INSTANCE, never the template.
-- ---------------------------------------------------------------------
create type instance_status as enum ('planning','active','complete','archived');
create type event_tier as enum ('tier1','tier2','tier3');

create table instance (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references template(id) on delete restrict,
  name        text not null,
  slug        text not null unique,
  tier        event_tier not null default 'tier1',
  status      instance_status not null default 'planning',
  event_date  date,
  venue       text,
  notes       text,
  created_by  uuid references app_user(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Per-instance state for a template item.
create table item_state (
  instance_id uuid not null references instance(id) on delete cascade,
  item_id     uuid not null references item(id) on delete cascade,
  done        boolean not null default false,
  owner_id    uuid references app_user(id),
  due_date    date,
  note        text,
  updated_by  uuid references app_user(id),
  updated_at  timestamptz not null default now(),
  primary key (instance_id, item_id)
);

-- Threaded comments against any item, for a given instance.
create table comment (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null references instance(id) on delete cascade,
  item_id     uuid references item(id) on delete cascade,
  section_id  uuid references section(id) on delete cascade,
  author_id   uuid not null references app_user(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Audit trail — who changed what, so an association can trust the record.
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references app_user(id),
  action      text not null,          -- 'item.toggle','block.update','instance.create'…
  entity      text not null,
  entity_id   uuid,
  instance_id uuid references instance(id) on delete set null,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index on section (template_id, sort_order);
create index on block (section_id, sort_order);
create index on item (block_id, sort_order);
create index on item_state (instance_id);
create index on comment (instance_id, item_id);
create index on audit_log (instance_id, created_at desc);
create index on audit_log (entity, entity_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['template','section','block','item','instance','item_state']
  loop
    execute format(
      'create trigger trg_touch_%1$s before update on %1$s
       for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Progress rollup — one query powers every progress bar in the UI.
-- ---------------------------------------------------------------------
create or replace view v_section_progress as
select
  i.id                              as instance_id,
  s.id                              as section_id,
  s.slug,
  count(it.id)                      as total,
  count(*) filter (where st.done)   as done,
  case when count(it.id) = 0 then null
       else round(100.0 * count(*) filter (where st.done) / count(it.id))
  end                               as pct
from instance i
join section s  on s.template_id = i.template_id
join block  b   on b.section_id  = s.id
join item   it  on it.block_id   = b.id
left join item_state st on st.item_id = it.id and st.instance_id = i.id
group by i.id, s.id, s.slug;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (production / Supabase)
-- Enabled by 002_rls.sql so the local prototype can run without auth.
-- ---------------------------------------------------------------------
