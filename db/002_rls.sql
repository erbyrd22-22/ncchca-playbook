-- =====================================================================
-- Row Level Security — apply in Supabase (production).
-- Skipped in the local prototype, which has no auth.uid().
--
-- Model:
--   viewer  → read everything, write nothing
--   editor  → read everything; edit template content, item_state, comments
--   admin   → everything, plus creating/deleting instances and managing users
-- =====================================================================

-- Helper: current user's role, read from app_user keyed to auth.uid()
create or replace function current_role_of() returns user_role as $$
  select role from app_user where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_editor() returns boolean as $$
  select coalesce(current_role_of() in ('editor','admin'), false);
$$ language sql stable security definer;

create or replace function is_admin() returns boolean as $$
  select coalesce(current_role_of() = 'admin', false);
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
alter table app_user   enable row level security;
alter table template   enable row level security;
alter table section    enable row level security;
alter table block      enable row level security;
alter table item       enable row level security;
alter table instance   enable row level security;
alter table item_state enable row level security;
alter table comment    enable row level security;
alter table audit_log  enable row level security;

-- app_user: everyone signed in can see the roster; only admins mutate.
create policy au_read   on app_user   for select using (auth.uid() is not null);
create policy au_self   on app_user   for update using (id = auth.uid())
                                      with check (id = auth.uid() and role = current_role_of());
create policy au_admin  on app_user   for all    using (is_admin()) with check (is_admin());

-- Template content: signed-in read; editor write.
create policy tpl_read  on template   for select using (auth.uid() is not null);
create policy tpl_write on template   for all    using (is_editor()) with check (is_editor());

create policy sec_read  on section    for select using (auth.uid() is not null);
create policy sec_write on section    for all    using (is_editor()) with check (is_editor());

create policy blk_read  on block      for select using (auth.uid() is not null);
create policy blk_write on block      for all    using (is_editor()) with check (is_editor());

create policy itm_read  on item       for select using (auth.uid() is not null);
create policy itm_write on item       for all    using (is_editor()) with check (is_editor());

-- Instances: signed-in read; editors update; only admins create/delete.
create policy ins_read  on instance   for select using (auth.uid() is not null);
create policy ins_upd   on instance   for update using (is_editor()) with check (is_editor());
create policy ins_ins   on instance   for insert with check (is_admin());
create policy ins_del   on instance   for delete using (is_admin());

-- Progress: signed-in read; editors write.
create policy st_read   on item_state for select using (auth.uid() is not null);
create policy st_write  on item_state for all    using (is_editor()) with check (is_editor());

-- Comments: signed-in read; any signed-in user may comment; authors and
-- admins may delete their own.
create policy cm_read   on comment    for select using (auth.uid() is not null);
create policy cm_ins    on comment    for insert with check (author_id = auth.uid());
create policy cm_del    on comment    for delete using (author_id = auth.uid() or is_admin());

-- Audit log: readable by editors and admins; written by the server only.
create policy al_read   on audit_log  for select using (is_editor());
