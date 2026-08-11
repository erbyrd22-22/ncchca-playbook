-- =====================================================================
-- Move from a direct Postgres connection to the Supabase API.
--
-- Previously the app connected as the postgres superuser with a password,
-- which bypassed RLS entirely — the policies existed but never actually
-- ran. Now every query carries the signed-in user's JWT, so RLS is the
-- real enforcement point. That requires explicit grants: RLS filters rows,
-- but the role still needs the underlying table privilege.
-- =====================================================================

-- audit_log had no INSERT policy; with a service connection that didn't
-- matter. Now the signed-in user writes their own audit rows.
drop policy if exists al_ins on audit_log;
create policy al_ins on audit_log
  for insert to authenticated
  with check (actor_id = auth.uid());

-- item_state rows are created lazily by whoever first touches an item.
drop policy if exists st_write on item_state;
create policy st_write on item_state
  for all to authenticated
  using (private.is_editor())
  with check (private.is_editor());

grant select on public.v_section_progress to authenticated;

grant select on public.template, public.section, public.block, public.item,
                public.instance, public.item_state, public.comment,
                public.app_user, public.audit_log to authenticated;
grant insert, update, delete on public.template, public.section, public.block,
                public.item, public.instance, public.item_state,
                public.comment to authenticated;
grant insert on public.audit_log to authenticated;
grant update on public.app_user to authenticated;
grant usage, select on all sequences in schema public to authenticated;
