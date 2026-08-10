-- Store configuration foundation.
--
-- Single-row table holding store-wide, non-secret configuration (name,
-- contact details, branding). This is what lets the rest of the app avoid
-- hardcoding store-specific values — see docs/ARCHITECTURE.md
-- ("Configuration strategy").
--
-- The single-row convention is enforced with a check constraint on `id`
-- rather than a separate "settings singleton" pattern — simplest option
-- that's sufficient for one store.

create table public.store_settings (
  id smallint primary key default 1,
  store_name text not null,
  logo_url text,
  phone text,
  whatsapp_number text,
  email text,
  address text,
  opening_hours jsonb,
  social_media jsonb,
  primary_color text,
  secondary_color text,
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id = 1)
);

alter table public.store_settings enable row level security;

-- Public catalogue pages need this to render header/footer/contact info.
create policy "store_settings_select_public"
  on public.store_settings
  for select
  to anon, authenticated
  using (true);

-- Only admins may create/update the single settings row.
create policy "store_settings_insert_admin"
  on public.store_settings
  for insert
  to authenticated
  with check (public.is_admin());

create policy "store_settings_update_admin"
  on public.store_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
