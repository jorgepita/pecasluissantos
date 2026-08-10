-- Admin authorization foundation.
--
-- `admin_users` is an allowlist of Supabase Auth users who are store
-- administrators. Membership is the source of truth for the `is_admin()`
-- helper function, which RLS policies on other tables call to decide
-- whether the current request is allowed to write.
--
-- There is deliberately no public sign-up path into this table. The first
-- (and any subsequent) admin is added manually, e.g. from the Supabase SQL
-- editor once the person already has an auth.users account:
--
--   insert into public.admin_users (id) values ('<their auth.users.id>');
--
-- See docs/DATABASE.md for the full rationale.

create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A signed-in user may check their own admin membership (used by the
-- client to decide whether to show admin UI). No one can list other rows.
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (id = auth.uid());

-- No insert/update/delete policies are defined for the anon/authenticated
-- roles on purpose: only the service_role (used from the Supabase
-- dashboard/SQL editor, never from client code) can modify this table.

-- Returns whether the current authenticated user is a store admin.
-- SECURITY DEFINER so it can read admin_users regardless of the caller's
-- own RLS visibility, while still only ever reporting on auth.uid() itself.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;
