-- =====================================================================
-- Security hardening — applied to production after Supabase's linter
-- flagged the issues below. Run this after 003_auth_sync.sql.
--
-- 1. v_section_progress defaulted to SECURITY DEFINER, which would let any
--    caller read progress across every instance regardless of RLS.
-- 2. SECURITY DEFINER functions had a mutable search_path.
-- 3. PostgREST exposes `public`, so every helper there was reachable as an
--    RPC endpoint. Revoking EXECUTE is not enough (PUBLIC holds a default
--    grant, and the RLS policies still need to call the role helpers), so
--    they move to a `private` schema PostgREST does not expose.
-- =====================================================================

alter view public.v_section_progress set (security_invoker = on);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_role_of() returns user_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.app_user where id = auth.uid();
$$;

create or replace function private.is_editor() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.current_role_of() in ('editor','admin'), false);
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.current_role_of() = 'admin', false);
$$;

revoke all on function private.current_role_of(), private.is_editor(), private.is_admin() from public;
grant execute on function private.current_role_of(), private.is_editor(), private.is_admin()
  to authenticated, service_role;

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function private.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.app_user (id, email, full_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          'viewer')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function private.handle_auth_user_update() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.app_user set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function private.touch_updated_at(), private.handle_new_auth_user(),
                      private.handle_auth_user_update() from public;

do $t$
declare t text;
begin
  foreach t in array array['template','section','block','item','instance','item_state'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s
                    for each row execute function private.touch_updated_at()', t);
  end loop;
end $t$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of email on auth.users
  for each row execute function private.handle_auth_user_update();

drop policy if exists au_read  on app_user;
drop policy if exists au_self  on app_user;
drop policy if exists au_admin on app_user;
create policy au_read  on app_user for select using (auth.uid() is not null);
create policy au_self  on app_user for update using (id = auth.uid())
                                   with check (id = auth.uid() and role = private.current_role_of());
create policy au_admin on app_user for all using (private.is_admin()) with check (private.is_admin());

drop policy if exists tpl_write on template;
create policy tpl_write on template for all using (private.is_editor()) with check (private.is_editor());
drop policy if exists sec_write on section;
create policy sec_write on section for all using (private.is_editor()) with check (private.is_editor());
drop policy if exists blk_write on block;
create policy blk_write on block for all using (private.is_editor()) with check (private.is_editor());
drop policy if exists itm_write on item;
create policy itm_write on item for all using (private.is_editor()) with check (private.is_editor());
drop policy if exists ins_upd on instance;
drop policy if exists ins_ins on instance;
drop policy if exists ins_del on instance;
create policy ins_upd on instance for update using (private.is_editor()) with check (private.is_editor());
create policy ins_ins on instance for insert with check (private.is_admin());
create policy ins_del on instance for delete using (private.is_admin());
drop policy if exists st_write on item_state;
create policy st_write on item_state for all using (private.is_editor()) with check (private.is_editor());
drop policy if exists cm_del on comment;
create policy cm_del on comment for delete using (author_id = auth.uid() or private.is_admin());
drop policy if exists al_read on audit_log;
create policy al_read on audit_log for select using (private.is_editor());

drop function if exists public.is_editor();
drop function if exists public.is_admin();
drop function if exists public.current_role_of();
drop function if exists public.handle_new_auth_user() cascade;
drop function if exists public.handle_auth_user_update() cascade;
drop function if exists public.touch_updated_at() cascade;
