-- Shared helper for the product-catalogue schema (Phase 1A).
--
-- `set_updated_at()` is a small, reusable trigger function that keeps an
-- `updated_at` column current on every UPDATE. It's attached to
-- `categories`, `brands`, and `products` in their own migrations below,
-- rather than redefined per table.
--
-- Note: `store_settings` (0002_create_store_settings.sql, already applied)
-- predates this convention and does not use it — its `updated_at` is set
-- by the application on write. Not retrofitted here since this phase must
-- not modify already-applied migrations. See docs/DATABASE.md.

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
