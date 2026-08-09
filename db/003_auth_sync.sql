-- =====================================================================
-- Keep app_user in sync with Supabase Auth.
-- Run AFTER 001_schema.sql and 002_rls.sql, in the Supabase SQL editor.
-- =====================================================================

-- When someone accepts an invite (or is created in the Auth dashboard),
-- give them an app_user row automatically. Everyone lands as 'viewer';
-- an admin promotes them deliberately. No one is ever elevated by default.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_user (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'viewer'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Keep the email column current if a user changes it in Auth.
create or replace function handle_auth_user_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.app_user set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function handle_auth_user_update();

-- Backfill anyone who already exists in Auth before this trigger was added.
insert into public.app_user (id, email, full_name, role)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       'viewer'
from auth.users u
where not exists (select 1 from public.app_user a where a.id = u.id)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- BOOTSTRAP THE FIRST ADMIN
--
-- RLS lets only an admin change roles — so the very first admin has to be
-- set here, from the SQL editor, which runs with elevated privileges.
-- Replace the email, run it, then do everything else through the app.
-- ---------------------------------------------------------------------
-- update public.app_user set role = 'admin' where email = 'you@yourdomain.com';


-- ---------------------------------------------------------------------
-- REMOVE THE LOCAL DEMO USERS
-- The seed script creates three fake accounts for the local prototype.
-- They have no Auth identity and cannot sign in, but delete them anyway
-- so the People list shows only real staff.
-- ---------------------------------------------------------------------
-- delete from public.app_user
--  where email in ('admin@ncchca.org','editor@ncchca.org','viewer@ncchca.org');
